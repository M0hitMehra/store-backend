import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
  });

export const dbConnect = async () => {
  try {
    const { connection } = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to ${connection.host}:${connection.port}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
