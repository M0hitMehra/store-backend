import jwt from "jsonwebtoken";
 import { User } from "../models/User.js";
import { catchAsyncError } from "./catchAsyncError.js";
import ErrorHandler from "../utils/errorHandlers.js";

export const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token)
    return next(new ErrorHandler("Please login to access this page", 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  req.user = await User.findById(decoded._id);

  next();
});
