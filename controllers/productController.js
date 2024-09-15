import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Product } from "../models/Product.js";
import ErrorHandler from "../utils/errorHandlers.js";
import { v2 as cloudinary } from "cloudinary";
import { mediaUpload } from "../utils/mediaUpload.js";
import mongoose from "mongoose";

// Get single product
export const getProductController = catchAsyncError(async (req, res, next) => {
  req.body._id = req.params.id;
  const product = await Product.findById(req.body)
    .populate("brand")
    .populate("color")
    .populate("size")
    .populate("category")
    .populate({
      path: "variants",
      select: "_id images category size color",
      populate: [
        { path: "category", select: "_id name" },
        { path: "size", select: "_id name" },
        { path: "color", select: "_id name" },
      ],
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
      price,
      stock,
      brand,
      color,
      size,
      description,
      story,
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

    if (!price) {
      return next(new ErrorHandler("Price is required", 400));
    }

    if (!stock) {
      return next(new ErrorHandler("Stock is required", 400));
    }

    if (!brand) {
      return next(new ErrorHandler("Brand is required", 400));
    }

    if (!color) {
      return next(new ErrorHandler("Colors are required", 400));
    }

    if (!size) {
      return next(new ErrorHandler("Sizes are required", 400));
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
      price,
      stock,
      brand,
      color,
      size,
      description,
      story,
      otherDetails,
      productId,
      variants,
      images:
        uploadedImages?.length > 0
          ? uploadedImages
          : [
              {
                url: "https://res.cloudinary.com/mohit786/image/upload/v1693677254/cv9gdgz150vtoimcga0e.jpg",
              },
            ],
      category,
    });

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
    color,
    size,
    sort = "createdAt", // Default sort field
    order = "asc", // Default sort order
  } = req.query;

  const query = {};

  // Handle text-based search
  if (search) {
    if (search.length < 3) {
      return next(new ErrorHandler("Please enter at least 3 characters", 400));
    }
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      // "color.name" might not work with $regex, ensure "color" is populated and indexed as needed
      { "otherDetails.productStory.title": { $regex: search, $options: "i" } },
      {
        "otherDetails.productDetails.description": {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Handle category, brand, color, size filtering
  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (color) query.color = color;
  if (size) query.size = size; // Assuming size is a single value, adjust if needed.

  // Determine sort order
  const sortOrder = order === "desc" ? -1 : 1;

  try {
    const products = await Product.find(query)
      .populate("brand")
      .populate("color")
      .populate("size")
      .populate("category")
      .sort({ [sort]: sortOrder })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
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

  // Delete images from Cloudinary
  const deleteImagesPromises = product.images.map((image) => {
    return cloudinary.uploader.destroy(image.public_id);
  });

  await Promise.all(deleteImagesPromises);

  // Delete the product from the database
  await Product.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Product and its images deleted successfully",
  });
});

// update a product
export const updateProduct = catchAsyncError(async (req, res, next) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const { id } = req.params;
  const updateData = req.body;

  // Check if the id is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid product ID", 400));
  }

  const product = await Product.findById(id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Update images if provided
  if (updateData.images) {
    // Delete old images from Cloudinary
    const deleteImagesPromises = product.images.map((image) => {
      return cloudinary.uploader.destroy(image.public_id);
    });
    await Promise.all(deleteImagesPromises);

    // Upload new images to Cloudinary
    const uploadImagesPromises = updateData.images.map(async (image) => {
      const result = await cloudinary.uploader.upload(image.url);
      return { public_id: result.public_id, url: result.secure_url };
    });
    updateData.images = await Promise.all(uploadImagesPromises);
  }

  // Update product details
  const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    product: updatedProduct,
  });
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
