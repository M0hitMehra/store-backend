import { Router } from "express";
import {
  createColorController,
  getAllColorController,
  getColorController,
} from "../controllers/colorController.js";

const router = Router();

router.route("/getSingle/:id").get(getColorController);
router.route("/getAll").get(getAllColorController);
router.route("/create").post(createColorController);

export default router;
