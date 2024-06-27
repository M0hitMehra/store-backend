import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Product } from "../models/Product.js";
import User from "../models/User.js";
import ErrorHandler from "../utils/errorHandlers.js";
import { mediaUpload } from "../utils/mediaUpload.js";
import { sendMail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

// Create a new user
export const createUser = catchAsyncError(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return next(new ErrorHandler("Please fill all the required fields", 404));
  }

  const doesUserExist = await User.findOne({ email: email });

  if (doesUserExist) {
    return next(new ErrorHandler("User already exists", 400));
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  req.body.otp = otp;
  req.body.otp_expiry = new Date(
    Date.now() + process.env.OTP_EXPIRE * 60 * 1000
  );

  const user = await User.create(req.body);

  sendMail(
    email,
    "Verify Your Account",
    `Your OTP is ${otp} if you haven't requested for this then ignore this message`
  );

  // images

  await user.save();
  sendToken(res, user, 201, "Opt Sent please verify your account");
});

export const verify = catchAsyncError(async (req, res, next) => {
  const otp = Number(req.body.otp);

  const user = await User.findById(req.user._id);
  if (user.otp !== otp || user.otp_expiry < Date.now())
    return next(new ErrorHandler("Invalid otp", 400));

  user.verified = true;
  user.otp = null;
  user.otp_expiry = null;

  await user.save();

  sendToken(res, user, 200, "Account verified successfully");
});

// get a user
export const getUser = catchAsyncError(async (req, res, next) => {
  const _id = req.user._id;
  const user = await User.findById(_id);

  sendToken(res, user, 200, `Welcome back ${user.firstName}`);
});

// login user
export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new ErrorHandler("Please fill all required fields", 401));

  const user = await User.findOne({ email }).select("+password");

  if (!user) return next(new ErrorHandler("Invalid credentials", 401));

  const passwordMatcher = await user.comparePassword(password);

  if (!passwordMatcher)
    return next(new ErrorHandler("Invalid credentials", 401));

  sendToken(res, user, 200, "Logged in successfully");
});

export const logout = catchAsyncError(async (req, res, next) => {
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(Date.now()),
  };

  res.status(200).cookie("token", null, options).json({
    success: true,
    message: "Logged out successfully",
  });
});

// update profile
export const updateProfile = catchAsyncError(async (req, res, next) => {
  const { firstName, lastName, address, phone } = req.body;

  const data = {};
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (address) data.address = address;
  if (phone) data.phone = phone;

  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const updatedUser = await User.findByIdAndUpdate(userId, data, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({ success: true, user: updatedUser });
});

// update profile image
export const updateProfileImage = catchAsyncError(async (req, res, next) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const options = {
    overwrite: true,
    invalidate: true,
    resource_type: "image",
  };

  const { image } = req.body;

  if (!image) {
    return next(new ErrorHandler("Image not found", 404));
  }

  const userId = req.user._id;

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (user?.verified === false) {
    return next(
      new ErrorHandler(
        "Only verified users are allowed to update profile image ",
        404
      )
    );
  }

  const prevAvatar = user.avatar; // Assuming user schema has an avatar field storing Cloudinary public ID and URL
  if (prevAvatar && prevAvatar.public_id) {
    await cloudinary.uploader.destroy(prevAvatar.public_id, options);
  }

  const media = await mediaUpload(image, next);
  const avatar = {
    public_id: media.public_id,
    url: media.secure_url,
  };
  user.avatar = avatar;

  await user.save();

  res.status(200).json({ success: true, user });
});

//Forgot password
export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHandler("User Not Found", 404));
  }

  if (user.resetPasswordToken && user.resetPasswordExpire > Date.now()) {
    return next(new ErrorHandler("Email has been already sent", 400));
  }

  const resetToken = await user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });
  console.log(user?.resetPasswordToken);

  const url = `https://store-4tfi.vercel.app/password/reset/${resetToken}`;

  const message = `Your reset password token is :- \n\n${url} \n\nIf you have not requested this email then ,Please ignore it.`;

  try {
    await sendMail(user.email, `Ecommerce Password Reset`, message);

    res.status(200).json({
      success: true,
      message: `Email Sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
  console.log(message);
});

//reset password
export const resetPassword = catchAsyncError(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  // console.log(resetPasswordToken, req.params.token, user);

  if (!user) {
    return next(new ErrorHandler("Invalid Token or Token Expired", 400));
  }
  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Password Does Not Match To Confirm Password", 400)
    );
  }

  user.password = req.body.newPassword;

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendToken(res, user, 200);
});

//Update User password
export const updatePassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");
  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Old Password is not correct", 401));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Old Password is not same as new password", 401)
    );
  }

  user.password = req.body.newPassword;

  await user.save();
  sendToken(res, user, 200);
});

// delete user
export const deleteUser = catchAsyncError(async (req, res, next) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const options = {
    overwrite: true,
    invalidate: true,
    resource_type: "image",
  };

  const id = req.user._id;

  // Find user by ID
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Delete user's avatar image from Cloudinary
  const avatar = user.avatar; // Assuming user schema has an avatar field storing Cloudinary public ID and URL
  if (avatar && avatar.public_id) {
    console.log("public_id", avatar.public_id);
    await cloudinary.uploader.destroy(avatar.public_id, options);
  }

  // Delete user from database
  await User.findByIdAndDelete(id);

  // Clear cookie and send response
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
  };

  res.status(200).cookie("token", null, cookieOptions).json({
    success: true,
    message: "User deleted successfully",
  });
});

// add to whishlist
export const addToWishlist = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  if (user.wishlist.includes(productId)) {
    return next(new ErrorHandler("Product already in wishlist", 400));
  }

  user.wishlist.push(productId);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Product added to wishlist",
    wishlist: user.wishlist,
  });
});

// Remove from Wishlist
export const removeFromWishlist = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const productIndex = user.wishlist.indexOf(productId);
  if (productIndex === -1) {
    return next(new ErrorHandler("Product not found in wishlist", 404));
  }

  user.wishlist.splice(productIndex, 1);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
    wishlist: user.wishlist,
  });
});

// Get all Wishlist Products
export const getWishlist = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate("wishlist");
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    wishlist: user.wishlist,
  });
});

// recently visited product post
export const saveRecentlyVisitedProduct = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user._id; // Assuming user is authenticated and req.user is available
    const productId = req.params.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Update the recently visited products list
    const maxVisitedProducts = 10; // Maximum number of recently visited products to store
    const newVisitedProduct = { product: productId, visitedAt: new Date() };

    user.recentlyVisited = [
      newVisitedProduct,
      ...user.recentlyVisited.filter(
        (item) => item?.product?.toString() !== productId?.toString()
      ),
    ].slice(0, maxVisitedProducts);

    await user.save();

    res.status(200).json({ success: true, message: "Product visit recorded" });
  }
);

// get all recently visited products
export const getReceentlyVisitedProducts = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    const user = await User.findById(userId).populate({
      path: "recentlyVisited.product",
    });

    let recentlyVisited = [];

    user?.recentlyVisited?.map((item) => {
      recentlyVisited.push(item?.product);
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({ success: true, recentlyVisited });
  }
);

// Add to CARt
export const addToCart = catchAsyncError(async (req, res, next) => {
  const { productId, quantity } = req.body;
  const product = await Product.findById(productId);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  if (product.stock < quantity) {
    return next(new ErrorHandler("Not enough stock available", 400));
  }

  const user = await User.findById(req.user._id);
  const existingItem = user.cart.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    return next(new ErrorHandler("Product is already in cart", 400));
  } else {
    user.cart.push({ product: productId, quantity });
  }

  await user.save();
  res
    .status(200)
    .json({ success: true, message: "Product added to cart", cart: user.cart });
});

// Remove item from cart
export const removeFromCart = catchAsyncError(async (req, res, next) => {
  const { productId } = req.body;
  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter((item) => item.product.toString() !== productId);
  await user.save();
  res.status(200).json({
    success: true,
    message: "Product removed from cart",
    cart: user.cart,
  });
});

// update product quantity
export const updateProductQuantity = catchAsyncError(async (req, res, next) => {
  const { productId, quantity } = req.body;
  const product = await Product.findById(productId);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  if (product.stock < quantity) {
    return next(new ErrorHandler("Not enough stock available", 400));
  }

  const user = await User.findById(req.user._id);
  const cartItem = user.cart.find(
    (item) => item.product.toString() === productId
  );

  if (!cartItem) {
    return next(new ErrorHandler("Product not found in cart", 404));
  }

  cartItem.quantity = quantity;
  await user.save();
  res
    .status(200)
    .json({ success: true, message: "Cart item updated", cart: user.cart });
});

// Get user cart
export const getCart = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate("cart.product");
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  res.status(200).json({ success: true, cart: user.cart });
});
