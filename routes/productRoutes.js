import { Router } from "express";
import {
  createProductController,
  deleteProduct,
  getAllProduct,
  getProductController,
} from "../controllers/productController.js";
import { authorizeRoles, isAuthenticated } from "../middlewares/auth.js";

const router = Router();

router.route("/product/:id").get(getProductController);
router.route("/products").get(getAllProduct);
router
  .route("/product/create")
  .post(authorizeRoles("admin"), createProductController);
router
  .route("/product/delete/:id")
  .delete(isAuthenticated, authorizeRoles("admin"), deleteProduct);

export default router;
