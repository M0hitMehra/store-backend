import { Router } from "express";
import {
  createProductController,
  deleteProduct,
  getAllProduct,
  getProductController,
  getProductsForVariants,
  updateProduct,
} from "../controllers/productController.js";
import { authorizeRoles, isAuthenticated } from "../middlewares/auth.js";

const router = Router();

router.route("/product/:id").get(getProductController);
router.route("/products").get(getAllProduct);
router.route("/product/create").post(createProductController);

router
  .route("/product/delete/:id")
  .delete(isAuthenticated, authorizeRoles("admin"), deleteProduct);

router
  .route("/product/update/:id")
  .put(isAuthenticated, authorizeRoles("admin"), updateProduct);

router.route("/product/variants").post(getProductsForVariants);

export default router;
