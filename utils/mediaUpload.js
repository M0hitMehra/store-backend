import { v2 as cloudinary } from "cloudinary";
import ErrorHandler from "./errorHandlers.js";

const options = {
  overwrite: true,
  invalidate: true,
  resource_type: "auto",
};

export const mediaUpload = async (media, next) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("medium", cloudinary.config().cloud_name);
  try {
    const cloudinary_res = await cloudinary.uploader.upload(media, {
      folder: "/shoes",
      overwrite: true,
      invalidate: true,
      resource_type: "auto",
      //   unique_filename: `image-${new Date().toISOString()}`,
    });

    return cloudinary_res;
  } catch (error) {
    return next(new ErrorHandler("Error in Deleting profile", 404));
  }
};
