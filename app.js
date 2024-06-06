import cookieParser from "cookie-parser";
import errorMiddleWare from "./middlewares/error.js";
import express from "express";
export const app = express();
import cors from "cors";
import bodyParser from 'body-parser';

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" })); // Adjust the limit as needed
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: function (origin, callback) {
      if (
        origin === "http://localhost:3000" ||
        origin === "https://store-4tfi.vercel.app"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
import productRoutes from "./routes/productRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import colorRoutes from "./routes/colorRoutes.js";
import sizeRoutes from "./routes/sizeRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";

app.use("/api/v1", productRoutes);
app.use("/api/v1/brand", brandRoutes);
app.use("/api/v1/color", colorRoutes);
app.use("/api/v1/size", sizeRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/auth", userRoutes);

app.use(errorMiddleWare);
