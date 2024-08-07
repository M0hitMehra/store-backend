import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Color } from "../models/Color.js";
import ErrorHandler from "../utils/errorHandlers.js";

// Get single color
export const getColorController = catchAsyncError(async (req, res, next) => {
  const color = await Color.findById(req.params.id);

  if (!color) {
    return next(new ErrorHandler("Color not found", 404));
  }
  res.status(200).json({
    success: true,
    color,
  });
});

// Create new color
export const createColorController = catchAsyncError(async (req, res, next) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return next(new ErrorHandler("Please provide both name and code", 400));
  }

  const color = await Color.create({ name, code });

  res.status(201).json({
    success: true,
    color,
  });
});

// Get all colors
export const getAllColorController = catchAsyncError(async (req, res, next) => {
  const colors = await Color.find();
  res.status(200).json({
    success: true,
    colors,
  });
});
