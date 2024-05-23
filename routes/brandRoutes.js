import { Router } from "express";
import {
  createBrandController,
  getAllBrandController,
  getBrandController,
} from "../controllers/brandController.js";

const router = Router();

router.route("/getSingle/:id").get(getBrandController);
router.route("/getAll").get(getAllBrandController);
router.route("/create").post(createBrandController);

export default router;
