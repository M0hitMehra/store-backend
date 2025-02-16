import { Router } from "express";
import {
  createOrder,
  getOrderDetails,
  getUserOrders,
  updateOrderStatus,
  cancelOrder,
  requestReturn,
  processRefund,
  getOrderStats,
  generateOrderInvoice,
  getOrderHistory,
} from "../controllers/orderController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { authorizeRoles } from "../middlewares/auth.js";

const router = Router();

// Public routes
// None

// Protected routes (require authentication)
router.route("/order").post(isAuthenticated, createOrder);

router.route("/orders").get(isAuthenticated, getUserOrders);

router.route("/order/:orderId").get(isAuthenticated, getOrderDetails);

router.route("/order/:orderId/cancel").post(isAuthenticated, cancelOrder);

router.route("/order/:orderId/return").post(isAuthenticated, requestReturn);

router.route("/order/:orderId/history").get(isAuthenticated, getOrderHistory);

// Admin only routes
router
  .route("/admin/order/:orderId/status")
  .put(isAuthenticated, authorizeRoles("admin"), updateOrderStatus);

router
  .route("/admin/order/:orderId/refund")
  .post(isAuthenticated, authorizeRoles("admin"), processRefund);

router
  .route("/admin/order/:orderId/invoice")
  .post(isAuthenticated, authorizeRoles("admin"), generateOrderInvoice);

router
  .route("/admin/orders/stats")
  .get(isAuthenticated, authorizeRoles("admin"), getOrderStats);

export default router;
