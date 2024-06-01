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
  verify,
} from "../controllers/userControllers.js";

const router = express.Router();

router.route("/register").post(createUser);

router.route("/verify").post(isAuthenticated, verify);

router.route("/login").post(login);

router.route("/logout").get(logout);

router.route("/user").get(isAuthenticated, getUser);

router.route("/wishlist/:productId").post(isAuthenticated, addToWishlist);

router.route("/wishlist/remove").post(isAuthenticated, removeFromWishlist);

router.route("/wishlist").get(isAuthenticated, getWishlist);


export default router;
