import { Router } from "express";
import { getRecommendedProductsController } from "../controllers/algorithmController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = Router();

router.route("/recommended/:id").get(isAuthenticated,getRecommendedProductsController);

export default router;
