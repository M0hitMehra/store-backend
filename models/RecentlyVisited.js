import mongoose from "mongoose";

const recentlyVisitedSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    visitedAt: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const RecentlyVisited = mongoose.model(
  "RecentlyVisited",
  recentlyVisitedSchema
);
export default RecentlyVisited;
