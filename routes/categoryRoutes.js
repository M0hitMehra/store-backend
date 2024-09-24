import { Router } from "express";
import {
  createCategoryController,
  deleteCategoryController,
  getAllCategoryController,
  getCategoryController,
  updateCategoryController,
} from "../controllers/categoryController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = Router();

router.route("/getSingle/:id").get(getCategoryController);

router.route("/getAll").get(getAllCategoryController);

router.route("/create").post(isAuthenticated, createCategoryController);

router.route("/update/:id").put(isAuthenticated, updateCategoryController);

router.route("/delete/:id").delete(isAuthenticated, deleteCategoryController);

export default router;
