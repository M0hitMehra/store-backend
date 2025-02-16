import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { Product } from "../models/Product.js";
import User from "../models/User.js";
import ErrorHandler from "../utils/errorHandlers.js";
import { mediaUpload } from "../utils/mediaUpload.js";
import { sendMail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import RecentlyVisited from "../models/RecentlyVisited.js";
import Address from "../models/Address.js";
import { Variant } from "../models/Variants.js";

// Create a new user
export const createUser = catchAsyncError(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    dateOfBirth,
    address: { street, city, state, postalCode, country },
  } = req.body;

  // Check for required fields
  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !phone ||
    !dateOfBirth ||
    !street ||
    !city ||
    !state ||
    !postalCode ||
    !country
  ) {
    return next(new ErrorHandler("Please fill all the required fields", 404));
  }

  // Check if the user already exists
  const doesUserExist = await User.findOne({ email });

  if (doesUserExist) {
    return next(new ErrorHandler("User already exists", 400));
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Prepare user data
  req.body.otp = otp;
  req.body.otp_expiry = new Date(
    Date.now() + process.env.OTP_EXPIRE * 60 * 1000
  );

  // Create new user instance
  const user = new User({
    firstName,
    lastName,
    email,
    password,
    phone,
    dateOfBirth,
    otp,
    otp_expiry: req.body.otp_expiry,
    address: {
      street,
      city,
      state,
      postalCode,
      country,
    },
  });

  // Send OTP email for account verification
  sendMail(
    email,
    "Verify Your Account",
    `Your OTP is ${otp}. If you haven't requested this, please ignore this message.`
  );

  // Save user to the database
  await user.save();

  // Send token to the client
  sendToken(res, user, 201, "OTP sent. Please verify your account.");
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
  const user = await User.findById(_id).populate("address");

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

export const updateProfile = catchAsyncError(async (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Update Profile API called`);

  const { firstName, lastName, phone, dateOfBirth, address } = req.body;

  console.log(`[${timestamp}] Request Body:`, {
    firstName,
    lastName,
    phone,
    dateOfBirth,
    address,
  });

  const data = {};
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (phone) data.phone = phone;
  if (dateOfBirth) data.dateOfBirth = dateOfBirth;

  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[${timestamp}] User not found: ${userId}`);
      return next(new ErrorHandler("User not found", 404));
    }

    // Update addresses
    if (address && Array.isArray(address)) {
      console.log(`[${timestamp}] Processing addresses`);
      for (const addr of address) {
        if (addr?._id) {
          console.log(`[${timestamp}] Updating address with ID: ${addr._id}`);
          await Address.findByIdAndUpdate(addr._id, addr, {
            new: true,
            runValidators: true,
            useFindAndModify: false,
          });
        } else {
          console.log(
            `[${timestamp}] Creating new address for user: ${userId}`
          );
          const newAddress = await Address.create({ ...addr, user: userId });
          user.address.push(newAddress._id);
          await user.save();
        }
      }
    }

    // Update user profile fields
    console.log(`[${timestamp}] Updating user profile for user: ${userId}`);
    const updatedUser = await User.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    await updatedUser.save();
    console.log(`[${timestamp}] User profile updated successfully: ${userId}`);

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(`[${timestamp}] Error occurred:`, error);
    next(error);
  }
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
 
  const url = `https://store-4tfi.vercel.app/reset/password/${resetToken}`;

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

  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const wishlistEntry = await Wishlist.findOne({
    user_id: userId,
    product: productId,
  });
  if (wishlistEntry) {
    return next(new ErrorHandler("Product already in wishlist", 400));
  }

  const newWishlistEntry = await Wishlist.create({
    user_id: userId,
    product: productId,
  });

  res.status(200).json({
    success: true,
    message: "Product added to wishlist",
    wishlist: newWishlistEntry,
  });
});

// Remove from Wishlist
export const removeFromWishlist = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  const wishlistEntry = await Wishlist.findOneAndDelete({
    user_id: userId,
    product: productId,
  });
  if (!wishlistEntry) {
    return next(new ErrorHandler("Product not found in wishlist", 404));
  }

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
  });
});

// Get all Wishlist Products
export const getWishlist = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const wishlist = await Wishlist.find({ user_id: userId }).populate("product");
  if (!wishlist) {
    return next(new ErrorHandler("Wishlist not found", 404));
  }

  res.status(200).json({
    success: true,
    wishlist,
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

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    // Update the recently visited products list
    const maxVisitedProducts = 10; // Maximum number of recently visited products to store
    const newVisitedProduct = { product: productId, user: userId };

    // Remove the product if it already exists
    await RecentlyVisited.deleteMany({ user: userId, product: productId });

    // Add the new product
    await RecentlyVisited.create(newVisitedProduct);

    // Keep only the latest `maxVisitedProducts` products
    const visitedProducts = await RecentlyVisited.find({ user: userId })
      .sort({ visitedAt: -1 })
      .limit(maxVisitedProducts);

    // Remove older products beyond the limit
    const productIdsToKeep = visitedProducts.map((item) => item._id);
    await RecentlyVisited.deleteMany({
      user: userId,
      _id: { $nin: productIdsToKeep },
    });

    res.status(200).json({ success: true, message: "Product visit recorded" });
  }
);

// get all recently visited products
export const getRecentlyVisitedProducts = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const recentlyVisited = await RecentlyVisited.find({ user: userId })
      .sort({ visitedAt: -1 })
      .limit(limit)
      .populate("product");

    const products = recentlyVisited.map((item) => item.product);

    res.status(200).json({ success: true, recentlyVisited: products });
  }
);

// Add to CARt
export const addToCart = catchAsyncError(async (req, res, next) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const userId = req.user._id;

  // Validate product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Validate variant exists and belongs to the product
  const variant = await Variant.findById(variantId);
  if (!variant) {
    return next(new ErrorHandler("Variant not found", 404));
  }

  // Verify variant belongs to product
  if (!product.variants.includes(variant._id)) {
    return next(new ErrorHandler("Invalid variant for this product", 400));
  }

  // Check variant stock
  if (variant.stock < quantity) {
    return next(new ErrorHandler("Not enough stock available", 400));
  }

  // Check if product variant already exists in user's cart
  const existingCartItem = await Cart.findOne({
    user_id: userId,
    product: productId,
    variant: variantId,
  });

  if (existingCartItem) {
    // If updating quantity is allowed, uncomment this block
    // const newQuantity = existingCartItem.quantity + quantity;
    // if (newQuantity > variant.stock) {
    //   return next(new ErrorHandler("Requested quantity exceeds available stock", 400));
    // }
    // existingCartItem.quantity = newQuantity;
    // await existingCartItem.save();
    // return res.status(200).json({
    //   success: true,
    //   message: "Cart quantity updated successfully"
    // });

    return next(
      new ErrorHandler("This product variant is already in cart", 400)
    );
  }

  // Create new cart item
  await Cart.create({
    user_id: userId,
    product: productId,
    variant: variantId,
    quantity,
  });

  res.status(200).json({
    success: true,
    message: "Product added to cart successfully",
  });
});

// Remove item from cart
export const removeFromCart = catchAsyncError(async (req, res, next) => {
  const { productId, variantId } = req.body;
  const userId = req.user._id;

  if (!productId || !variantId) {
    return next(
      new ErrorHandler("Product ID and Variant ID are required", 400)
    );
  }

  // Check if the cart item exists
  const existingCartItem = await Cart.findOne({
    user_id: userId,
    product: productId,
    variant: variantId,
  });

  if (!existingCartItem) {
    return next(new ErrorHandler("Item not found in cart", 404));
  }

  // Remove the cart item
  await Cart.findOneAndDelete({
    user_id: userId,
    product: productId,
    variant: variantId,
  });

  res.status(200).json({
    success: true,
    message: "Item removed from cart successfully",
  });
});

// Optional: Add a remove all variants of a product
export const removeAllProductVariants = catchAsyncError(
  async (req, res, next) => {
    const { productId } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return next(new ErrorHandler("Product ID is required", 400));
    }

    // Remove all variants of the product from cart
    const result = await Cart.deleteMany({
      user_id: userId,
      product: productId,
    });

    if (result.deletedCount === 0) {
      return next(
        new ErrorHandler("No items found in cart for this product", 404)
      );
    }

    res.status(200).json({
      success: true,
      message: `All variants of the product removed from cart`,
      removedCount: result.deletedCount,
    });
  }
);

// update product quantity
export const updateProductQuantity = catchAsyncError(async (req, res, next) => {
  const { productId, variantId, quantity } = req.body;

  // Validate required fields
  if (!productId || !variantId || !quantity) {
    return next(
      new ErrorHandler("Please provide productId, variantId and quantity", 400)
    );
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check if variant exists and belongs to the product
  const variant = await Variant.findOne({
    _id: variantId,
    product: productId,
  });

  if (!variant) {
    return next(new ErrorHandler("Product variant not found", 404));
  }

  // Check variant stock
  if (variant.stock < quantity) {
    return next(
      new ErrorHandler(
        `Only ${variant.stock} items available in this variant`,
        400
      )
    );
  }

  const user = req.user._id;

  // Find cart item with both product and variant
  const cartItem = await Cart.findOne({
    user_id: user,
    product: productId,
    variant: variantId,
  });

  if (!cartItem) {
    return next(new ErrorHandler("Product variant not found in cart", 404));
  }

  // Update quantity
  cartItem.quantity = quantity;
  await cartItem.save();

  // Populate cart item with product and variant details for response
  const updatedCartItem = await Cart.findById(cartItem._id)
    .populate("product", "title images")
    .populate("variant", "color size price images");

  res.status(200).json({
    success: true,
    message: "Cart item updated successfully",
    cartItem: updatedCartItem,
  });
});

// Get user cart
export const getCart = catchAsyncError(async (req, res, next) => {
  const user = req.user._id;
  const cartItems = await Cart.find({ user_id: user }).populate("product");

  if (!cartItems) {
    return next(new ErrorHandler("Cart not found", 404));
  }

  res.status(200).json({ success: true, cart: cartItems });
});
