const mongoose = require("mongoose");

const categories = ["Electronics", "Fashion", "Home & Living", "Beauty", "Accessories", "Sports"];

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  description: { type: String, required: true, trim: true, minlength: 20, maxlength: 3000 },
  category: { type: String, required: true, enum: categories, index: true },
  price: { type: Number, required: true, min: 0, validate: Number.isFinite },
  originalPrice: { type: Number, default: null, min: 0, validate: Number.isFinite },
  discount: { type: Number, default: 0, min: 0, max: 99 },
  images: {
    type: [{ type: String, trim: true, match: /^https?:\/\/.+/i }],
    required: true,
    validate: [(images) => images.length > 0 && images.length <= 8, "Provide between 1 and 8 product images"]
  },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  stock: { type: Number, required: true, min: 0, validate: Number.isInteger, default: 0, index: true },
  featured: { type: Boolean, default: false, index: true }
}, { timestamps: true });

productSchema.pre("validate", function setDiscount() {
  this.discount = this.originalPrice > this.price
    ? Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100)
    : 0;
});

module.exports = mongoose.model("Product", productSchema);