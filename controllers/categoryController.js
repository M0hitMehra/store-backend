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
export const createCategoryController = catchAsyncError(
  async (req, res, next) => {
    const { name, parentId } = req.body;

    const newCategory = new Category({ name: name.toLowerCase() });

    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return next(new ErrorHandler("Parent category not found", 400));
      }
      newCategory.parent = parentCategory._id;
      await newCategory.save();

      parentCategory.children.push(newCategory._id);
      await parentCategory.save();
    } else {
      await newCategory.save();
    }

    res.status(201).json({
      success: true,
      category: newCategory,
    });
  }
);

// Get all categories
export const getAllCategoryController = catchAsyncError(
  async (req, res, next) => {
    const categories = await Category.find().populate("children").exec();
    res.status(200).json({ categories });
  }
);

// update category
export const updateCategoryController = catchAsyncError(
  async (req, res, next) => {
    const { name, parentId } = req.body;

    // Check for existing category with the same name (case-insensitive)
    const existingCategory = await Category.findOne({
      name: name.toLowerCase(),
    });
    if (existingCategory && existingCategory._id.toString() !== req.params.id) {
      return next(new ErrorHandler("Category name already exists", 400));
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    category.name = name.toLowerCase();

    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return next(new ErrorHandler("Parent category not found", 400));
      }
      category.parent = parentCategory._id;
    } else {
      category.parent = null;
    }

    await category.save();
    res.status(200).json({ success: true, category });
  }
);

// delete category
export const deleteCategoryController = catchAsyncError(
  async (req, res, next) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    await category.remove();
    res.status(200).json({
      success: true,
      message: "Category deleted",
    });
  }
);
