import express from "express";

import { isAuthenticated } from "../middlewares/auth.js";
import {
  createUser,
  getUser,
  login,
  logout,
  verify,
} from "../controllers/userControllers.js";

const router = express.Router();

router.route("/register").post(createUser);

router.route("/verify").post(isAuthenticated, verify);

router.route("/login").post(login);

router.route("/logout").get(logout);

router.route("/user").get(isAuthenticated, getUser);
export default router;
