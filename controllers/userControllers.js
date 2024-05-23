import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { User } from "../models/User.js";
import ErrorHandler from "../utils/errorHandlers.js";
import { sendMail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";

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

  const otp = Math.floor(Math.random() * 1000000);

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
  const user = await User.findOne(req.body);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
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
    expires: new Date(Date.now()),
  };

  res.status(200).cookie("token", null, options).json({
    success: false,
    message: "Logged out successfully",
  });
});
