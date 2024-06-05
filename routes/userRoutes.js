import express from "express";

import { isAuthenticated } from "../middlewares/auth.js";
import {
  addToWishlist,
  createUser,
  getUser,
  getWishlist,
  login,
  logout,
  removeFromWishlist,
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
  .post(isAuthenticated, removeFromWishlist);

router.route("/wishlist").get(isAuthenticated, getWishlist);

router.route("/user/update").post(isAuthenticated, updateProfile);

router.route("/user/update/image").post(isAuthenticated, updateProfileImage);

export default router;
