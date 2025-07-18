const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticateToken, requireAdmin, requireOwnershipOrAdmin } = require("../middleware/auth");
const { sanitizeInput, validateObjectId } = require("../middleware/validation");

// User specific orders
router.get("/my-orders", authenticateToken, orderController.getMyOrders);
router.get("/:id", authenticateToken, validateObjectId("id"), requireOwnershipOrAdmin("user"), orderController.getOrderById);
router.post("/", authenticateToken, sanitizeInput, orderController.createOrder);

// Admin specific orders
router.get("/", authenticateToken, requireAdmin, orderController.getAllOrders);
router.put("/:id/status", authenticateToken, requireAdmin, validateObjectId("id"), sanitizeInput, orderController.updateOrderStatus);

module.exports = router;


