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
        url: {
          type: String,
          required: true,
        },
        image_id: {
          type: String,
        },
      },
    ],
    color: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      required: true,
    },
    size: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Size",
      required: true,
    }],
    description: {
      type: String,
    },
    story: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    otherDetails: {
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
