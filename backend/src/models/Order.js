const mongoose = require("mongoose");
const { randomBytes } = require("node:crypto");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true, trim: true, maxlength: 120 },
  productImage: { type: String, default: "", maxlength: 2048 },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { type: String, required: true, trim: true, minlength: 7, maxlength: 30 },
  line1: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  line2: { type: String, trim: true, maxlength: 120, default: "" },
  city: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  region: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  postalCode: { type: String, required: true, trim: true, minlength: 3, maxlength: 20 },
  country: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  orderNumber: { type: String, required: true, unique: true, index: true },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: [(items) => items.length > 0 && items.length <= 50, "An order must contain between 1 and 50 items"]
  },
  shippingAddress: { type: shippingAddressSchema, required: true },
  paymentMethod: { type: String, enum: ["cod_demo", "test_demo"], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  shipping: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"], default: "pending", index: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" }
}, { timestamps: true });

orderSchema.pre("validate", function assignOrderNumber() {
  if (!this.orderNumber) {
    this.orderNumber = `LC-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);