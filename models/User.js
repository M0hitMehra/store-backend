import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    avatar: {
      public_id: String,
      url: {
        type: String,
        default:
          "https://res.cloudinary.com/mohit786/image/upload/v1693677254/cv9gdgz150vtoimcga0e.jpg",
      },
    },

    phone: {
      type: String,
      required: true,
    },

    address: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
        required: true,
      },
    ],

    role: {
      type: String,
      default: "user",
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    recentlyVisited: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        visitedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

    paymentMethods: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PaymentMethod",
      },
    ],

    recentOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    otp: Number,
    otp_expiry: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Password hash middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});

// JWT token generation
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
  });
};

// Compare password
userSchema.methods.comparePassword = async function (newpassword) {
  return await bcrypt.compare(newpassword, this.password);
};

// Password reset token generation
userSchema.methods.getResetPasswordToken = async function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

userSchema.index({ otp_expiry: 1 }, { expireAfterSeconds: 1 });

const User = mongoose.model("User", userSchema);
export default User;
