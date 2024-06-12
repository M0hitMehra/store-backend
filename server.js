import { app } from "./app.js";
import dotenv  from "dotenv";
import { dbConnect } from "./config/db.js";

dbConnect()

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on ${process.env.CLOUDINARY_API_SECRET}`);
});
