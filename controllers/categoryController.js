import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Category } from "../models/Category.js";
import ErrorHandler from "../utils/errorHandlers.js";

// Get single category
export const getCategoryController = catchAsyncError(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }
  res.status(200).json({
    success: true,
    category,
  });
});

// Create new category
export const createCategoryController = catchAsyncError(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(new ErrorHandler("Please provide a name", 400));
  }

  const category = await Category.create({ name });

  res.status(201).json({
    success: true,
    category,
  });
});

// Get all categories
export const getAllCategoryController = catchAsyncError(async (req, res, next) => {
  const categories = await Category.find();
  res.status(200).json({
    success: true,
    categories,
  });
});
