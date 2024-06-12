import { v2 as cloudinary } from "cloudinary";
 
cloudinary.config({
  cloud_name:process.env.CLOUDINARY_NAME,
  api_key:process.env.CLOUDINARY_API_KEY,
  api_secret:process.env.CLOUDINARY_API_SECRET
})

const options = {
  overwrite: true,
  invalidate: true,
  resource_type: "auto",
};

export const mediaUpload = async (media) => {
  console.log("medium",process.env.CLOUDINARY_API_KEY  )
  try {
    const cloudinary_res = await cloudinary.uploader.upload(media, {
      folder: "/shoes",
      //   unique_filename: `image-${new Date().toISOString()}`,
    });
  console.log("media inside")

    return cloudinary_res
  } catch (error) {
  console.log("error", error)
  return error;
  }
};
