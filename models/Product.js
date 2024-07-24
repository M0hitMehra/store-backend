import mongoose from "mongoose";

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
    description: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
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
      countryOrigin: {
        title: String,
        description: String,
      },
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
