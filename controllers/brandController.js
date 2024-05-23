 import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Brand } from "../models/Brand.js";
 import ErrorHandler from "../utils/errorHandlers.js";
 
// Get single brand
export const getBrandController = catchAsyncError(async (req, res, next) => {
  const brand = await Brand.findById(req.params.id);

  if (!brand) {
    return next(new ErrorHandler("Brand not found", 404));
  }
  res.status(200).json({
    success: true,
    brand,
  });
});

// Create new brand
export const createBrandController = catchAsyncError(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(new ErrorHandler("Please provide a name", 400));
  }

  const brand = await Brand.create({ name });

  res.status(201).json({
    success: true,
    brand,
  });
});

// Get all brands
export const getAllBrandController = catchAsyncError(async (req, res, next) => {
  const brands = await Brand.find();
  res.status(200).json({
    success: true,
    brands,
  });
});
