import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
