import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Product } from "../models/Product.js";
import ErrorHandler from "../utils/errorHandlers.js";

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
      // images,
      category,
    } = req.body;

    // Validate required fields
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

    // if (!images) {
    //   return next(new ErrorHandler("Images are required", 400));
    // }

    let images = [
      {
        url: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/308158/02/sv01/fnd/AUS/fmt/png/Porsche-Legacy-Caven-2.0-Unisex-Motorsport-Sneakers",
        image_id: "red",
      },
      {
        url: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/308158/02/fnd/AUS/fmt/png/Porsche-Legacy-Caven-2.0-Unisex-Motorsport-Sneakers",
        image_id: "123",
      },
      {
        url: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/308158/02/sv02/fnd/AUS/fmt/png/Porsche-Legacy-Caven-2.0-Unisex-Motorsport-Sneakers",
        image_id: "098777798",
      },
      {
        url: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/308158/02/sv04/fnd/AUS/fmt/png/Porsche-Legacy-Caven-2.0-Unisex-Motorsport-Sneakers",
        image_id: "03498777798",
      },
    ];
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
      images,
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
