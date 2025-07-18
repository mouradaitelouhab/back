const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { authenticateToken } = require("../middleware/auth");
const { sanitizeInput } = require("../middleware/validation");

// All cart routes require authentication
router.use(authenticateToken);

router.get("/", cartController.getUserCart);
router.post("/add", sanitizeInput, cartController.addItemToCart);
router.put("/update/:productId", sanitizeInput, cartController.updateCartItemQuantity);
router.delete("/remove/:productId", cartController.removeItemFromCart);
router.delete("/clear", cartController.clearCart);

module.exports = router;


