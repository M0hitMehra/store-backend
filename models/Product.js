import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: "N/A",
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, "Please enter stocks"],
      default: 1,
      min: 0,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
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
    color: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      required: true,
    },
    size: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Size",
        required: true,
      },
    ],
    description: {
      type: String,
    },
    
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
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
