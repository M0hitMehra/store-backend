import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Size } from "../models/Sizes.js";
 import ErrorHandler from "../utils/errorHandlers.js";

// Get single size
export const getSizeController = catchAsyncError(async (req, res, next) => {
  const size = await Size.findById(req.params.id);

  if (!size) {
    return next(new ErrorHandler("Size not found", 404));
  }
  res.status(200).json({
    success: true,
    size,
  });
});

// Create new size
export const createSizeController = catchAsyncError(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(new ErrorHandler("Please provide a name", 400));
  }

  const size = await Size.create({ name });

  res.status(201).json({
    success: true,
    size,
  });
});

// Get all sizes
export const getAllSizeController = catchAsyncError(async (req, res, next) => {
  const sizes = await Size.find();
  res.status(200).json({
    success: true,
    sizes,
  });
});
