import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Product } from "../models/Product.js";
import User from "../models/User.js";
import { getRecommendedProducts } from "../utils/utilities.js";

export const getRecommendedProductsController = catchAsyncError(
  async (req, res, next) => {
    console.log("Getting recommended products for user:", req.user._id);
    const recommendedProducts = await getRecommendedProducts(req.user.id);

    res.status(200).json({
      success: true,
      recommendedProducts,
    });
  }
);
