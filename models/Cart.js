import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a user can't add the same product variant multiple times
cartItemSchema.index({ user_id: 1, product: 1, variant: 1 }, { unique: true });

// Virtual populate to get variant details
cartItemSchema.virtual('variantDetails', {
  ref: 'Variant',
  localField: 'variant',
  foreignField: '_id',
  justOne: true
});

const Cart = mongoose.model("Cart", cartItemSchema);

export default Cart;