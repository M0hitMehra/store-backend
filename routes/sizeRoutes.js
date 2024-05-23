import { Router } from "express";
import {
  createSizeController,
  getAllSizeController,
  getSizeController,
} from "../controllers/sizeController.js";

const router = Router();

router.route("/getSingle/:id").get(getSizeController);
router.route("/getAll").get(getAllSizeController);
router.route("/create").post(createSizeController);

export default router;
