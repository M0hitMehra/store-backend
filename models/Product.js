import mongoose from "mongoose";
import dummy from "mongoose-dummy";

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: "N/A",
    },
    stock: {
      type: Number,
      required: [true, "Please enter stocks"],
      default: 1,
      min: 0,
    },
    images: [
      {
        public_id: String,
        url: {
          type: String,
          default:
            "https://res.cloudinary.com/mohit786/image/upload/v1693677254/cv9gdgz150vtoimcga0e.jpg",
        },
      },
    ],
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: {
      type: String,
    },
    variants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant",
      },
    ],
    otherDetails: {
      productStory: {
        title: String,
        description: String,
      },
      productDetails: {
        title: String,
        description: [{ type: String }],
      },
      manufacturAddress: {
        title: String,
        description: String,
      },
      countoryOrigin: {
        title: String,
        description: String,
      },
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
