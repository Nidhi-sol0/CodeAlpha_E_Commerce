const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const config = require("../config/env");
const asyncHandler = require("../middleware/asyncHandler");

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

function validateAddress(address) {
  if (!address || typeof address !== "object" || Array.isArray(address)) throw badRequest("Shipping information is required");
  const fields = ["name", "email", "phone", "line1", "city", "region", "postalCode", "country"];
  for (const field of fields) {
    if (typeof address[field] !== "string" || !address[field].trim()) {
      throw badRequest(`Shipping ${field} is required`);
    }
  }
  if (address.name.trim().length < 2 || address.name.trim().length > 80) throw badRequest("Shipping name must be between 2 and 80 characters");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) throw badRequest("Enter a valid contact email");
  if (address.phone.trim().length < 7 || address.phone.trim().length > 30) throw badRequest("Enter a valid contact phone number");
  if (address.line1.trim().length < 3 || address.line1.trim().length > 120) throw badRequest("Enter a valid street address");
  for (const field of ["city", "region", "postalCode", "country"]) {
    if (address[field].trim().length > (field === "postalCode" ? 20 : 80)) throw badRequest(`Shipping ${field} is too long`);
  }
  if (address.line2 !== undefined && (typeof address.line2 !== "string" || address.line2.trim().length > 120)) throw badRequest("Shipping address line 2 is invalid");
  return Object.fromEntries([...fields, "line2"].map((field) => [field, String(address[field] || "").trim()]));
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw badRequest("Your order must contain between 1 and 50 cart items");
  }
  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item) || !mongoose.isValidObjectId(item.productId)) {
      throw badRequest("Each order item must contain a valid product ID");
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw badRequest("Item quantity must be a whole number between 1 and 99");
    }
    const id = String(item.productId);
    quantities.set(id, (quantities.get(id) || 0) + item.quantity);
  }
  for (const quantity of quantities.values()) {
    if (quantity > 99) throw badRequest("Combined product quantity cannot exceed 99");
  }
  return quantities;
}

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function canCancelOrderStatus(status) {
  return ["pending", "confirmed", "processing"].includes(status);
}

exports.createOrder = asyncHandler(async (request, response) => {
  const quantities = normalizeItems(request.body?.items);
  const shippingAddress = validateAddress(request.body?.shippingAddress);
  const paymentMethod = request.body?.paymentMethod;
  if (!["cod_demo", "test_demo"].includes(paymentMethod)) throw badRequest("Choose a supported demo payment method");

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const productIds = [...quantities.keys()];
      const products = await Product.find({ _id: { $in: productIds } }).session(session);
      if (products.length !== productIds.length) throw conflict("One or more products are no longer available");

      const productById = new Map(products.map((product) => [String(product._id), product]));
      const orderItems = [];
      let subtotal = 0;
      for (const [productId, quantity] of quantities) {
        const product = productById.get(productId);
        if (!product) throw conflict("One or more products are no longer available");
        if (product.stock < quantity) throw conflict(`${product.name} has only ${product.stock} available`);
        const lineSubtotal = roundMoney(product.price * quantity);
        subtotal += lineSubtotal;
        orderItems.push({
          product: product._id,
          productName: product.name,
          productImage: product.images?.[0] || "",
          price: product.price,
          quantity,
          subtotal: lineSubtotal
        });
      }
      subtotal = roundMoney(subtotal);
      const shipping = subtotal === 0 || subtotal >= config.freeShippingThreshold ? 0 : roundMoney(config.shippingFee);
      const tax = roundMoney(subtotal * config.taxRate);

      for (const [productId, quantity] of quantities) {
        const result = await Product.updateOne(
          { _id: productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { session }
        );
        if (result.modifiedCount !== 1) throw conflict("Product stock changed. Refresh your bag and try again");
      }

      [order] = await Order.create([{
        user: request.user._id,
        items: orderItems,
        shippingAddress,
        paymentMethod,
        subtotal,
        shipping,
        tax,
        total: roundMoney(subtotal + shipping + tax),
        status: "confirmed",
        paymentStatus: "pending"
      }], { session });
    });
  } catch (error) {
    if (error.code === 11000) throw conflict("Please retry your order");
    if (error.code === 112 || error.hasErrorLabel?.("TransientTransactionError")) {
      throw conflict("Inventory changed during checkout. Refresh your bag and try again");
    }
    throw error;
  } finally {
    await session.endSession();
  }

  response.status(201).json({ success: true, data: order });
});

exports.listOrders = asyncHandler(async (request, response) => {
  const page = Math.max(1, Math.floor(Number(request.query.page) || 1));
  const limit = Math.min(50, Math.max(1, Math.floor(Number(request.query.limit) || 10)));
  const filter = { user: request.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter)
  ]);
  response.json({ success: true, data: orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getOrder = asyncHandler(async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ success: false, error: "Order not found" });
  }
  const order = await Order.findOne({ _id: request.params.id, user: request.user._id });
  if (!order) return response.status(404).json({ success: false, error: "Order not found" });
  response.json({ success: true, data: order });
});

exports.cancelOrder = asyncHandler(async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({ success: false, error: "Order not found" });
  }

  const session = await mongoose.startSession();
  let cancelledOrder;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: request.params.id, user: request.user._id }).session(session);
      if (!order) {
        throw Object.assign(new Error("Order not found"), { statusCode: 404 });
      }

      if (!canCancelOrderStatus(order.status)) {
        throw Object.assign(new Error("This order cannot be cancelled in its current status."), { statusCode: 409 });
      }

      const productQuantityMap = new Map();
      for (const item of order.items) {
        const productId = String(item.product);
        const quantity = Number(item.quantity) || 0;
        if (!productId || quantity <= 0) continue;
        productQuantityMap.set(productId, (productQuantityMap.get(productId) || 0) + quantity);
      }

      for (const [productId, quantity] of productQuantityMap.entries()) {
        const result = await Product.updateOne(
          { _id: productId },
          { $inc: { stock: quantity } },
          { session }
        );
        if (result.matchedCount !== 1) {
          throw Object.assign(new Error("Unable to restore stock for one or more items."), { statusCode: 409 });
        }
      }

      cancelledOrder = await Order.findOneAndUpdate(
        { _id: order._id, user: request.user._id, status: { $in: ["pending", "confirmed", "processing"] } },
        { $set: { status: "cancelled" } },
        { new: true, session }
      );

      if (!cancelledOrder) {
        throw Object.assign(new Error("This order is no longer eligible for cancellation."), { statusCode: 409 });
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode === 404) {
      return response.status(404).json({ success: false, error: "Order not found" });
    }
    if (statusCode === 409) {
      return response.status(409).json({ success: false, error: error.message || "This order cannot be cancelled at the moment." });
    }
    throw error;
  } finally {
    await session.endSession();
  }

  response.json({ success: true, message: "Order cancelled successfully.", data: cancelledOrder });
});