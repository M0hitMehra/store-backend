import { catchAsyncError } from "../middlewares/catchAsyncError.js";
 import Order from "../models/Order.js";
import { Product } from "../models/Product.js";
 import {Variant} from "../models/Variants.js";
import ErrorHandler from "../utils/errorHandlers.js";

// Create new order
export const createOrder = catchAsyncError(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    shippingMethod,
    paymentMethod,
    appliedCoupons = [],
  } = req.body;

  // Validate items exist and have stock
  const itemsWithDetails = await Promise.all(
    items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) {
        return next(new ErrorHandler(`Product not found: ${item.product}`, 404));
      }

      let variant;
      if (item.variant) {
        variant = await Variant.findById(item.variant);
        if (!variant) {
          return next(new ErrorHandler(`Variant not found: ${item.variant}`, 404));
        }
        if (variant.stock < item.quantity) {
          return next(
            new ErrorHandler(
              `Insufficient stock for variant: ${variant._id}`,
              400
            )
          );
        }
      }

      return {
        ...item,
        price: variant ? variant.price : product.price,
      };
    })
  );

  // Calculate order amounts
  const subtotal = itemsWithDetails.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.18; // 18% GST
  const shippingFee = shippingMethod === "Express" ? 100 : 50;
  
  // Calculate discounts from coupons
  const totalDiscount = appliedCoupons.reduce((sum, coupon) => {
    if (coupon.type === "Percentage") {
      return sum + (subtotal * coupon.discount / 100);
    }
    return sum + coupon.discount;
  }, 0);

  const totalAmount = subtotal + tax + shippingFee - totalDiscount;

  // Create order
  const order = await Order.create({
    user: req.user._id,
    items: itemsWithDetails,
    pricing: {
      subtotal,
      tax: {
        amount: tax,
        details: [{ type: "GST", rate: 18, amount: tax }],
      },
      shippingFee,
      discount: totalDiscount,
      totalAmount,
    },
    shippingAddress,
    shippingMethod,
    paymentMethod,
    appliedCoupons,
    orderSource: {
      platform: req.body.platform || "web",
      deviceInfo: req.body.deviceInfo || {},
      ipAddress: req.ip,
    },
    customerNotes: req.body.customerNotes,
  });

  // Update product/variant stock
  await Promise.all(
    items.map(async (item) => {
      if (item.variant) {
        await Variant.findByIdAndUpdate(item.variant, {
          $inc: { stock: -item.quantity },
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    })
  );

  res.status(201).json({
    success: true,
    order,
  });
});

// Get order details
export const getOrderDetails = catchAsyncError(async (req, res, next) => {
  const order = await Order.findOne({ orderId: req.params.orderId })
    .populate("user", "name email")
    .populate("items.product", "title images")
    .populate("items.variant", "color size price")
    .populate("shippingAddress");

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Check if user is authorized to view this order
  if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// Get user orders
export const getUserOrders = catchAsyncError(async (req, res, next) => {
  const { status, limit = 10, page = 1 } = req.query;
  
  const query = { user: req.user._id };
  if (status) query.orderStatus = status;

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("items.product", "title images")
    .populate("items.variant", "color size");

  const totalOrders = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page,
  });
});

// Update order status (Admin only)
export const updateOrderStatus = catchAsyncError(async (req, res, next) => {
  const { status, comment } = req.body;
  const order = await Order.findOne({ orderId: req.params.orderId });

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  order.updateStatus(status, comment, req.user._id);
  await order.save();

  res.status(200).json({
    success: true,
    order,
  });
});

// Cancel order
export const cancelOrder = catchAsyncError(async (req, res, next) => {
  const order = await Order.findOne({ orderId: req.params.orderId });

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  if (!order.canBeCancelled()) {
    return next(new ErrorHandler("Order cannot be cancelled", 400));
  }

  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  // Restore stock
  await Promise.all(
    order.items.map(async (item) => {
      if (item.variant) {
        await Variant.findByIdAndUpdate(item.variant, {
          $inc: { stock: item.quantity },
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    })
  );

  order.updateStatus("Cancelled", req.body.reason, req.user._id);
  await order.save();

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
  });
});

// Request return
export const requestReturn = catchAsyncError(async (req, res, next) => {
  const { items, reason } = req.body;
  const order = await Order.findOne({ orderId: req.params.orderId });

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  if (!order.isReturnable) {
    return next(new ErrorHandler("Order is not eligible for return", 400));
  }

  order.returns.push({
    items: items.map(item => ({
      product: item.product,
      variant: item.variant,
      quantity: item.quantity,
      reason
    })),
    status: "Requested"
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Return requested successfully",
  });
});

// Process refund (Admin only)
export const processRefund = catchAsyncError(async (req, res, next) => {
  const { amount, reason } = req.body;
  const order = await Order.findOne({ orderId: req.params.orderId });

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  if (!order.isRefundable) {
    return next(new ErrorHandler("Order is not eligible for refund", 400));
  }

  order.addRefund(amount, reason, req.user._id);
  await order.save();

  res.status(200).json({
    success: true,
    message: "Refund processed successfully",
  });
});

// Get order statistics (Admin only)
export const getOrderStats = catchAsyncError(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const matchStage = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  const stats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$pricing.totalAmount" },
        averageOrderValue: { $avg: "$pricing.totalAmount" },
        totalRefunds: { 
          $sum: {
            $cond: [
              { $eq: ["$paymentStatus", "Refunded"] },
              "$pricing.totalAmount",
              0
            ]
          }
        }
      }
    }
  ]);

  const statusDistribution = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    stats: stats[0],
    statusDistribution,
  });
});

// 11. Generate Invoice
export const generateOrderInvoice = catchAsyncError(async (req, res, next) => {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("user items.product items.variant");
  
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }
  
    const invoice = await generateInvoice(order);
    order.invoice = {
      number: invoice.number,
      generatedAt: new Date(),
      url: invoice.url,
      status: "Generated",
    };
    await order.save();
  
    res.status(200).json({
      success: true,
      invoice,
    });
  });

  
// 8. Get Order History
export const getOrderHistory = catchAsyncError(async (req, res, next) => {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
  
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }
  
    res.status(200).json({
      success: true,
      history: order.orderHistory,
    });
  });

export default {
  createOrder,
  getOrderDetails,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  requestReturn,
  processRefund,
  getOrderStats,
};