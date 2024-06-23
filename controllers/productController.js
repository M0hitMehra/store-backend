import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Product } from "../models/Product.js";
import ErrorHandler from "../utils/errorHandlers.js";
import { v2 as cloudinary } from "cloudinary";
import { mediaUpload } from "../utils/mediaUpload.js";

// Get single product
export const getProductController = catchAsyncError(async (req, res, next) => {
  req.body._id = req.params.id;
  const product = await Product.findById(req.body)
    .populate("brand")
    .populate("color")
    .populate("size")
    .populate("category");

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
      category,
    } = req.body;

    // Validate required fields
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
      images: uploadedImages,
      category,
    });

    res.status(201).json({
      success: true,
      product,
    });
  }
);

export const getAllProduct = catchAsyncError(async (req, res, next) => {
  const products = await Product.find(req.query)
    .populate("brand")
    .populate("color")
    .populate("size")
    .populate("category");
  res.status(200).json({
    success: true,
    products,
  });
});
