import { Router } from "express";
import {
  createProductController,
  getAllProduct,
  getProductController,
} from "../controllers/productController.js";

const router = Router();

router.route("/product/:id").get(getProductController);
router.route("/products").get(getAllProduct);
router.route("/product/").post(createProductController);

export default router;
