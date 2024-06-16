import express from "express";

import { isAuthenticated } from "../middlewares/auth.js";
import {
  addToWishlist,
  createUser,
  deleteUser,
  getReceentlyVisitedProducts,
  getUser,
  getWishlist,
  login,
  logout,
  removeFromWishlist,
  resetPassword,
  saveRecentlyVisitedProduct,
  updateProfile,
  updateProfileImage,
  verify,
} from "../controllers/userControllers.js";

const router = express.Router();

router.route("/register").post(createUser);

router.route("/verify").post(isAuthenticated, verify);

router.route("/login").post(login);

router.route("/logout").get(logout);

router.route("/user").get(isAuthenticated, getUser);

router.route("/wishlist/:productId").post(isAuthenticated, addToWishlist);

router
  .route("/wishlist/remove/:productId")
  .delete(isAuthenticated, removeFromWishlist);

router.route("/wishlist").get(isAuthenticated, getWishlist);

router.route("/user/update").post(isAuthenticated, updateProfile);

router.route("/user/delete").delete(isAuthenticated, deleteUser);

router.route("/user/reset/:token").put(isAuthenticated, resetPassword);

router.route("/user/update/image").post(isAuthenticated, updateProfileImage);

router
  .route("/user/history/:id")
  .post(isAuthenticated, saveRecentlyVisitedProduct);

router
  .route("/user/recently-visited")
  .get(isAuthenticated, getReceentlyVisitedProducts);

export default router;
