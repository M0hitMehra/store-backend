import { Router } from "express";
import {
  createCategoryController,
  getAllCategoryController,
  getCategoryController,
} from "../controllers/categoryController.js";

const router = Router();

router.route("/getSingle/:id").get(getCategoryController);
router.route("/getAll").get(getAllCategoryController);
router.route("/create").post(createCategoryController);

export default router;
