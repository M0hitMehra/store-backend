import { Product } from "../models/Product.js";
import User from "../models/User.js";
// import { getPopularProducts } from "./productUtils.js"; // Utility to fetch popular products

export const getRecommendedProducts = async (userId) => {
  try {
    // Fetch user details including wishlist, cart, and recent orders
    const user = await User.findById(userId)
      .populate("wishlist", "category brand")
      .populate("cart.product", "category brand")
      .populate({
        path: "recentOrders",
        populate: { path: "items.product", select: "category brand" },
      });

    if (!user) {
      throw new Error("User not found");
    }

    // Extract product IDs, categories, and brands from wishlist and cart
    const wishlistProductIds = user.wishlist.map((product) => product._id);
    const cartProductIds = user.cart.map((item) => item.product._id);
    const wishlistCategories = user.wishlist.map((product) => product.category);
    const wishlistBrands = user.wishlist.map((product) => product.brand);
    const cartCategories = user.cart.map((item) => item.product.category);
    const cartBrands = user.cart.map((item) => item.product.brand);

    // Get related products (same category or brand)
    const relatedProducts = await Product.find({
      _id: { $nin: [...wishlistProductIds, ...cartProductIds] }, // Exclude already added products
      $or: [
        { category: { $in: [...wishlistCategories, ...cartCategories] } },
        { brand: { $in: [...wishlistBrands, ...cartBrands] } },
      ],
    })
      .sort({ rating: -1, createdAt: -1 }) // Sort by rating and recency
      .limit(10); // Limit recommendations

    // Get frequently bought together products from order history
    const purchasedProductIds = user.recentOrders.flatMap((order) =>
      order.items.map((item) => item.product._id)
    );

    const frequentlyBoughtTogether = await Product.find({
      _id: { $nin: [...wishlistProductIds, ...cartProductIds] }, // Exclude already added
      _id: { $in: purchasedProductIds },
    })
      .sort({ rating: -1, createdAt: -1 }) // Sort by rating and recency
      .limit(5);

    // Merge and deduplicate recommendations
    const recommendedProducts = [
      ...new Set([...relatedProducts, ...frequentlyBoughtTogether]),
    ];

    // If recommendations are insufficient, add popular products as fallback
    if (recommendedProducts.length < 10) {
      const popularProducts = await getPopularProducts(10 - recommendedProducts.length);
      recommendedProducts.push(...popularProducts);
    }

    // Shuffle recommendations for diversity
    const shuffledRecommendations = recommendedProducts.sort(
      () => Math.random() - 0.5
    );

    return shuffledRecommendations.slice(0, 10); // Return top 10 recommendations
  } catch (error) {
    console.error("Error getting recommended products:", error);
    return [];
  }
};


export const getPopularProducts = async (limit = 5) => {
  try {
    const popularProducts = await Product.find()
      .sort({ salesCount: -1, rating: -1 }) // Sort by sales count and rating
      .limit(limit);

    return popularProducts;
  } catch (error) {
    console.error("Error fetching popular products:", error);
    return [];
  }
};