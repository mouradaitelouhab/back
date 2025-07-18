const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Get all orders (Admin only)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("user", "username email").populate("items.product", "name price");
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate("items.product", "name price");
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "username email").populate("items.product", "name price");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new order
const createOrder = async (req, res) => {
  const { shippingAddress, billingAddress } = req.body;

  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);

      if (!product || product.stockQuantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Not enough stock for ${item.product.name}` });
      }

      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
      });
      totalAmount += item.quantity * item.price;

      // Reduce product stock
      product.stockQuantity -= item.quantity;
      await product.save();
    }

    const newOrder = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress: shippingAddress || req.user.shippingAddress,
      billingAddress: billingAddress || req.user.billingAddress,
      paymentStatus: "Pending", // This will be updated after payment processing
      orderStatus: "Pending",
    });

    await newOrder.save();

    // Clear the user's cart after order creation
    cart.items = [];
    await cart.save();

    res.status(201).json({ success: true, message: "Order created successfully", data: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update order status (Admin only)
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.orderStatus = status;
    await order.save();

    res.json({ success: true, message: "Order status updated successfully", data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
};


