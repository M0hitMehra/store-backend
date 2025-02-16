import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Product } from "../models/Product.js";
import ErrorHandler from "../utils/errorHandlers.js";
import { v2 as cloudinary } from "cloudinary";
import { mediaUpload } from "../utils/mediaUpload.js";
import mongoose from "mongoose";
import { Variant } from "../models/Variants.js";

// Get single product
export const getProductController = catchAsyncError(async (req, res, next) => {
  const productId = req.params.id;
  const product = await Product.findById(productId)
    .populate("brand", "name")
    .populate("category", "name")
    .populate({
      path: "variants",
      populate: [
        {
          path: "color",
        },
        {
          path: "size",
        },
      ],
      select: "_id color size price stock images",
    });

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    success: true,
    product,
  });
});

// Create new product
export const createProductController = catchAsyncError(
  async (req, res, next) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const options = {
      overwrite: true,
      invalidate: true,
      resource_type: "image",
    };

    const {
      title,
      stock,
      brand,
      description,
      otherDetails,
      images,
      productId,
      category,
      variants,
    } = req.body;

    // Validate required fields
    if (!productId) {
      return next(new ErrorHandler("Product ID must be provided", 400));
    }

    if (!title) {
      return next(new ErrorHandler("Title is required", 400));
    }

    if (!stock) {
      return next(new ErrorHandler("Stock is required", 400));
    }

    if (!brand) {
      return next(new ErrorHandler("Brand is required", 400));
    }

    if (!category) {
      return next(new ErrorHandler("Category is required", 400));
    }

    const uploadedImages = [];
    if (images) {
      for (const image of images) {
        const media = await mediaUpload(image, next);
        uploadedImages.push({
          public_id: media?.public_id,
          url: media?.secure_url,
        });
      }
    }

    const product = await Product.create({
      title,
      stock,
      brand,
      description,
      otherDetails,
      productId,
      images:
        uploadedImages.length > 0
          ? uploadedImages
          : [
              {
                url: "https://res.cloudinary.com/mohit786/image/upload/v1693677254/cv9gdgz150vtoimcga0e.jpg",
              },
            ],
      category,
    });

    // Create variants
    if (variants && variants.length > 0) {
      for (const variantData of variants) {
        const variant = await Variant.create({
          ...variantData,
          product: product._id,
        });
        product.variants.push(variant._id);
      }
      await product.save();
    }

    res.status(201).json({
      success: true,
      product,
    });
  }
);

// get all products
export const getAllProduct = catchAsyncError(async (req, res, next) => {
  const {
    page = 1,
    limit = 9,
    search = "",
    category,
    brand,
    colors, // Now accepts array of color IDs
    sizes, // Now accepts array of size IDs
    minPrice,
    maxPrice,
    sort = "createdAt",
    order = "asc",
  } = req.query;

  const query = {};

  // Handle text-based search with improved fields
  if (search) {
    if (search.length < 3) {
      return next(new ErrorHandler("Please enter at least 3 characters", 400));
    }
    query.$or = [
      { productId: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { "otherDetails.productStory.title": { $regex: search, $options: "i" } },
      {
        "otherDetails.productStory.description": {
          $regex: search,
          $options: "i",
        },
      },
      {
        "otherDetails.productDetails.title": { $regex: search, $options: "i" },
      },
      {
        "otherDetails.productDetails.description": {
          $regex: search,
          $options: "i",
        },
      },
      {
        "otherDetails.manufacturAddress.description": {
          $regex: search,
          $options: "i",
        },
      },
      {
        "otherDetails.countoryOrigin.description": {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Handle basic filters
  if (category) {
    query.category = mongoose.Types.ObjectId.isValid(category)
      ? new mongoose.Types.ObjectId(category)
      : null;
  }

  if (brand) {
    query.brand = mongoose.Types.ObjectId.isValid(brand)
      ? new mongoose.Types.ObjectId(brand)
      : null;
  }

  // Handle variant-based filters
  const variantFilters = [];

  // Handle color filter
  if (colors) {
    const colorArray = Array.isArray(colors) ? colors : [colors];
    if (colorArray.length > 0) {
      variantFilters.push({
        variants: {
          $elemMatch: {
            color: {
              $in: colorArray.map((c) =>
                mongoose.Types.ObjectId.isValid(c)
                  ? new mongoose.Types.ObjectId(c)
                  : null
              ),
            },
          },
        },
      });
    }
  }

  // Handle size filter
  if (sizes) {
    const sizeArray = Array.isArray(sizes) ? sizes : [sizes];
    if (sizeArray.length > 0) {
      variantFilters.push({
        variants: {
          $elemMatch: {
            size: {
              $in: sizeArray.map((s) =>
                mongoose.Types.ObjectId.isValid(s)
                  ? new mongoose.Types.ObjectId(s)
                  : null
              ),
            },
          },
        },
      });
    }
  }

  // Handle price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter = {
      variants: {
        $elemMatch: {
          price: {},
        },
      },
    };

    if (minPrice !== undefined) {
      priceFilter.variants.$elemMatch.price.$gte = Number(minPrice);
    }

    if (maxPrice !== undefined) {
      priceFilter.variants.$elemMatch.price.$lte = Number(maxPrice);
    }

    variantFilters.push(priceFilter);
  }

  // Combine all filters
  if (variantFilters.length > 0) {
    query.$and = variantFilters;
  }

  // Determine sort order and field
  const sortOrder = order === "desc" ? -1 : 1;
  const sortOptions = {};

  // Handle different sort fields
  switch (sort) {
    case "price":
      // Sort by the minimum price of variants
      sortOptions["variants.price"] = sortOrder;
      break;
    case "stock":
      // Sort by total stock across variants
      sortOptions["stock"] = sortOrder;
      break;
    default:
      sortOptions[sort] = sortOrder;
  }

  try {
    // Build the aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "variants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
          pipeline: [
            {
              $lookup: {
                from: "colors",
                localField: "color",
                foreignField: "_id",
                as: "color",
              },
            },
            {
              $lookup: {
                from: "sizes",
                localField: "size",
                foreignField: "_id",
                as: "size",
              },
            },
            {
              $addFields: {
                color: { $arrayElemAt: ["$color", 0] },
                size: { $arrayElemAt: ["$size", 0] },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          brand: { $arrayElemAt: ["$brand", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          minPrice: { $min: "$variants.price" },
          maxPrice: { $max: "$variants.price" },
          totalStock: { $sum: "$variants.stock" },
        },
      },
      { $sort: sortOptions },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          products: [
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ],
        },
      },
    ];

    const result = await Product.aggregate(pipeline);

    const products = result[0].products;
    const total = result[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getAllProduct:", error);
    return next(
      new ErrorHandler("An error occurred while fetching products", 500)
    );
  }
});

// delete a product
export const deleteProduct = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Check if the id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid product ID", 400));
  }

  // Find the product
  const product = await Product.findById(id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  console.log("Product images:", product?.images);

  if (product.images && product.images?.length > 0) {
    // Delete images from Cloudinary
    const deleteImagesPromises = product.images.map((image) => {
      if (image?.public_id) {
        return cloudinary.uploader.destroy(image.public_id);
      }
    });
    await Promise.all(deleteImagesPromises);
  }

  const variantsIds = product?.variants?.map((v) => v._id);

  for (let variant in variantsIds) {
    await Variant.findByIdAndDelete(variant);
  }

  // Delete the product from the database
  await Product.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Product and its images deleted successfully",
  });
});

// update a product
export const updateProduct = catchAsyncError(async (req, res, next) => {
  console.time("Total updateProduct Execution Time");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.time("Initialization Time");
  const { id } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid product ID", 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  console.timeEnd("Initialization Time");

  try {
    console.time("Find Product Execution Time");
    const product = await Product.findById(id).populate("variants");
    console.timeEnd("Find Product Execution Time");

    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    // Main Product Images Handling
    if (updateData.images?.length > 0) {
      console.time("Main Images Processing Time");
      const deleteImagesPromises = product.images.map((image) => {
        if (image.public_id) {
          return cloudinary.uploader.destroy(image.public_id);
        }
      });
      await Promise.all(deleteImagesPromises);

      const uploadImagesPromises = updateData.images.map(async (image) => {
        if (image.url.startsWith("data:")) {
          const result = await cloudinary.uploader.upload(image.url);
          return { public_id: result.public_id, url: result.secure_url };
        }
        return image;
      });
      updateData.images = await Promise.all(uploadImagesPromises);
      console.timeEnd("Main Images Processing Time");
    }

    // Variants Handling
    if (updateData.variants) {
      console.time("Variants Processing Time");
      const existingVariantIds = product.variants.map((v) => v._id.toString());
      const updatedVariantIds = updateData.variants
        .filter((v) => v._id)
        .map((v) => v._id.toString());

      const variantsToDelete = existingVariantIds.filter(
        (id) => !updatedVariantIds.includes(id)
      );

      for (const variantId of variantsToDelete) {
        console.time(`Variant Deletion for ID: ${variantId}`);
        const variant = await Variant.findById(variantId);
        if (variant?.images?.length) {
          const deleteVariantImagesPromises = variant.images.map((image) => {
            if (image.public_id) {
              return cloudinary.uploader.destroy(image.public_id);
            }
          });
          await Promise.all(deleteVariantImagesPromises);
        }
        await Variant.findByIdAndDelete(variantId);
        console.timeEnd(`Variant Deletion for ID: ${variantId}`);
      }

      const variantPromises = updateData.variants.map(async (variantData) => {
        console.time(`Variant Processing for ID: ${variantData._id || "New"}`);
        if (variantData._id) {
          const variant = await Variant.findById(variantData._id);

          if (variantData.images?.length > 0) {
            const deleteVariantImagesPromises = variant.images.map((image) => {
              if (image.public_id) {
                return cloudinary.uploader.destroy(image.public_id);
              }
            });
            await Promise.all(deleteVariantImagesPromises);

            const uploadVariantImagesPromises = variantData.images.map(
              async (image) => {
                if (image.url.startsWith("data:")) {
                  const result = await cloudinary.uploader.upload(image.url);
                  return {
                    public_id: result.public_id,
                    url: result.secure_url,
                  };
                }
                return image;
              }
            );
            variantData.images = await Promise.all(uploadVariantImagesPromises);
          }

          const updatedVariant = await Variant.findByIdAndUpdate(
            variantData._id,
            { ...variantData, product: id },
            { new: true, runValidators: true, session }
          );
          console.timeEnd(
            `Variant Processing for ID: ${variantData._id || "New"}`
          );
          return updatedVariant;
        } else {
          if (variantData.images?.length > 0) {
            const uploadVariantImagesPromises = variantData.images.map(
              async (image) => {
                if (image.url.startsWith("data:")) {
                  const result = await cloudinary.uploader.upload(image.url);
                  return {
                    public_id: result.public_id,
                    url: result.secure_url,
                  };
                }
                return image;
              }
            );
            variantData.images = await Promise.all(uploadVariantImagesPromises);
          }

          const newVariant = await Variant.create(
            [{ ...variantData, product: id }],
            {
              session,
            }
          );
          console.timeEnd(
            `Variant Processing for ID: ${variantData._id || "New"}`
          );
          return newVariant;
        }
      });

      const updatedVariants = await Promise.all(variantPromises);
      updateData.variants = updatedVariants.map((v) => v?.map((e) => e?._id));
    }

    // Update Product Details
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        ...updateData,
        variants: updateData?.variants,
        otherDetails: {
          productStory: {
            title: updateData.otherDetails?.productStory?.title || "",
            description:
              updateData.otherDetails?.productStory?.description || "",
          },
          productDetails: {
            title: updateData.otherDetails?.productDetails?.title || "",
            description:
              updateData.otherDetails?.productDetails?.description || [],
          },
          manufacturAddress: {
            title: updateData.otherDetails?.manufacturAddress?.title || "",
            description:
              updateData.otherDetails?.manufacturAddress?.description || "",
          },
          countoryOrigin: {
            title: updateData.otherDetails?.countoryOrigin?.title || "",
            description:
              updateData.otherDetails?.countoryOrigin?.description || "",
          },
        },
      },
      {
        new: true,
        runValidators: true,
        session,
      }
    ).populate([
      "brand",
      "category",
      {
        path: "variants",
        populate: ["color", "size"],
      },
    ]);
    console.timeEnd("Product Update Execution Time");

    // Commit Transaction
    console.time("Commit Transaction Time");
    await session.commitTransaction();
    console.timeEnd("Commit Transaction Time");

    res.status(200).json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error in updateProduct:", error);
    await session.abortTransaction();
    return next(new ErrorHandler(error.message, 500));
  } finally {
    console.time("Session End Time");
    session.endSession();
    console.timeEnd("Session End Time");
    console.timeEnd("Total updateProduct Execution Time");
  }
});

// get product for size and color selection
// Get products by productId, color._id, and size._id
export const getProductsForVariants = catchAsyncError(
  async (req, res, next) => {
    const { productId, colorId, sizeId } = req.body;

    if (!productId || !colorId || !sizeId) {
      return next(
        new ErrorHandler("ProductId, Color ID, and Size ID are required", 400)
      );
    }

    const products = await Product.find({
      productId,
      color: colorId,
      size: sizeId,
    })
      .populate("brand")
      .populate("color")
      .populate("size")
      .populate("category");

    if (!products || products.length === 0) {
      return next(
        new ErrorHandler("No products found matching the criteria", 404)
      );
    }

    res.status(200).json({
      success: true,
      products,
    });
  }
);
