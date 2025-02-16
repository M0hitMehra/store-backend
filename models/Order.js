import mongoose from "mongoose";
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        // Add status for individual items
        status: {
          type: String,
          enum: ["Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
          default: "Processing"
        }
      },
    ],
    pricing: {
      subtotal: { type: Number, required: true },
      tax: {
        amount: { type: Number, required: true },
        details: [{
          type: { type: String }, // GST, VAT, etc.
          rate: Number,
          amount: Number
        }]
      },
      shippingFee: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true }
    },
    currency: {
      type: String,
      default: "INR",
      required: true,
    },
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    shippingMethod: {
      type: String,
      enum: ["Standard", "Express"],
      required: true,
    },
    expectedDeliveryDate: { type: Date },
    carrier: { type: String },
    paymentMethod: {
      type: String,
      enum: ["COD", "Credit Card", "Debit Card", "UPI", "Net Banking"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    paymentDetails: {
      gatewayTransactionId: String,
      gatewayName: String, // Razorpay, Stripe, etc.
      gatewayResponse: {
        status: String,
        message: String,
        timestamp: Date,
        responseCode: String
      },
      paidAt: Date
    },
    orderStatus: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Processing",
    },
    orderHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        comment: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      },
    ],
    trackingInfo: {
      trackingId: String,
      carrier: String,
      url: String,
      lastUpdated: Date,
      estimatedDelivery: Date,
      actualDelivery: Date
    },
    refunds: [
      {
        refundId: { type: String, default: uuidv4 },
        amount: { type: Number, required: true },
        reason: { type: String },
        status: {
          type: String,
          enum: ["Pending", "Processed", "Failed"],
          default: "Pending"
        },
        processedAt: Date,
        processedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    returns: [
      {
        returnId: { type: String, default: uuidv4 },
        items: [{
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
          },
          variant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Variant"
          },
          quantity: Number,
          reason: String
        }],
        status: {
          type: String,
          enum: ["Requested", "Approved", "Rejected", "Completed"],
          default: "Requested"
        },
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    appliedCoupons: [
      {
        code: { type: String, required: true },
        discount: { type: Number, required: true },
        type: {
          type: String,
          enum: ["Percentage", "Fixed"],
          required: true
        }
      },
    ],
    invoice: {
      number: String,
      generatedAt: Date,
      url: String,
      status: {
        type: String,
        enum: ["Generated", "Pending", "Failed"],
        default: "Pending"
      }
    },
    orderSource: {
      platform: {
        type: String,
        enum: ["web", "mobile_app", "marketplace"],
        required: true,
        default: "web"
      },
      deviceInfo: {
        type: Object,
        default: {}
      },
      ipAddress: String
    },
    customerNotes: { type: String },
    internalNotes: { type: String },
    isFlagged: { type: Boolean, default: false },
    flaggedReason: { type: String },
    fulfillmentCenter: { type: String },
    warehouseLocation: { type: String },
    metadata: {
      type: Map,
      of: String,
      default: new Map()
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
orderSchema.index({ 
  orderId: 1, 
  user: 1, 
  orderStatus: 1, 
  paymentStatus: 1,
  createdAt: -1 
});

orderSchema.index({ "paymentDetails.gatewayTransactionId": 1 });
orderSchema.index({ "trackingInfo.trackingId": 1 });

// Virtuals
orderSchema.virtual('isRefundable').get(function() {
  const deliveryDate = new Date(this.orderHistory.find(h => h.status === 'Delivered')?.timestamp);
  const now = new Date();
  return (now - deliveryDate) <= (7 * 24 * 60 * 60 * 1000); // 7 days
});

orderSchema.virtual('isReturnable').get(function() {
  const deliveryDate = new Date(this.orderHistory.find(h => h.status === 'Delivered')?.timestamp);
  const now = new Date();
  return (now - deliveryDate) <= (10 * 24 * 60 * 60 * 1000); // 10 days
});

// Methods
orderSchema.methods.canBeCancelled = function() {
  return ['Processing'].includes(this.orderStatus);
};

orderSchema.methods.updateStatus = function(newStatus, comment, updatedBy) {
  this.orderStatus = newStatus;
  this.orderHistory.push({
    status: newStatus,
    timestamp: new Date(),
    comment,
    updatedBy
  });
};

orderSchema.methods.addRefund = function(amount, reason, processedBy) {
  this.refunds.push({
    amount,
    reason,
    processedBy,
    processedAt: new Date()
  });
  this.paymentStatus = "Refunded";
};

// Pre-save hooks
orderSchema.pre("save", async function(next) {
  // Verify total amount calculation
  const calculatedTotal = 
    this.pricing.subtotal + 
    this.pricing.tax.amount + 
    this.pricing.shippingFee - 
    this.pricing.discount;

  if (Math.abs(this.pricing.totalAmount - calculatedTotal) > 0.01) {
    next(new Error('Total amount calculation mismatch'));
  }

  // Add to order history if status changed
  if (this.isModified('orderStatus')) {
    if (!this.orderHistory.some(h => h.status === this.orderStatus)) {
      this.orderHistory.push({
        status: this.orderStatus,
        timestamp: new Date()
      });
    }
  }

  next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;