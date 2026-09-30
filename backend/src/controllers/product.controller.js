const mongoose = require("mongoose");
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");

const sortOptions = {
  featured: { featured: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { rating: -1, reviewCount: -1 }
};
const writableFields = [
  "name", "slug", "description", "category", "price", "originalPrice",
  "images", "rating", "reviewCount", "stock", "featured"
];

function pickWritableFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return Object.fromEntries(writableFields
    .filter((field) => Object.hasOwn(body, field))
    .map((field) => [field, body[field]]));
}

function parseNumber(value, name, fallback) {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${name} must be a non-negative number`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.listProducts = asyncHandler(async (request, response) => {
  const page = Math.max(1, Math.floor(parseNumber(request.query.page, "page", 1)));
  const limit = Math.min(48, Math.max(1, Math.floor(parseNumber(request.query.limit, "limit", 12))));
  const minPrice = parseNumber(request.query.minPrice, "minPrice", undefined);
  const maxPrice = parseNumber(request.query.maxPrice, "maxPrice", undefined);
  const rating = parseNumber(request.query.rating, "rating", undefined);
  const sort = request.query.sort || "featured";

  if (!sortOptions[sort]) {
    return response.status(400).json({ success: false, error: "Unsupported sort option" });
  }
  if (rating !== undefined && rating > 5) {
    return response.status(400).json({ success: false, error: "rating must be between 0 and 5" });
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return response.status(400).json({ success: false, error: "minPrice cannot exceed maxPrice" });
  }

  const filter = {};
  if (request.query.search) {
    const search = String(request.query.search).trim().slice(0, 100);
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: "i" } },
      { description: { $regex: escapeRegex(search), $options: "i" } },
      { category: { $regex: escapeRegex(search), $options: "i" } }
    ];
  }
  if (request.query.category) filter.category = String(request.query.category).trim();
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (rating !== undefined) filter.rating = { $gte: rating };
  if (["true", "in_stock"].includes(request.query.availability)) filter.stock = { $gt: 0 };
  if (["false", "out_of_stock"].includes(request.query.availability)) filter.stock = 0;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortOptions[sort]).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter)
  ]);

  response.json({
    success: true,
    data: products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

exports.getProduct = asyncHandler(async (request, response) => {
  const key = request.params.id;
  const product = mongoose.isValidObjectId(key)
    ? await Product.findById(key)
    : await Product.findOne({ slug: key });

  if (!product) return response.status(404).json({ success: false, error: "Product not found" });
  response.json({ success: true, data: product });
});

exports.createProduct = asyncHandler(async (request, response) => {
  const product = await Product.create(pickWritableFields(request.body));
  response.status(201).json({ success: true, data: product });
});

exports.updateProduct = asyncHandler(async (request, response) => {
  const product = await Product.findById(request.params.id);
  if (!product) return response.status(404).json({ success: false, error: "Product not found" });
  product.set(pickWritableFields(request.body));
  await product.save();
  response.json({ success: true, data: product });
});

exports.deleteProduct = asyncHandler(async (request, response) => {
  const product = await Product.findByIdAndDelete(request.params.id);
  if (!product) return response.status(404).json({ success: false, error: "Product not found" });
  response.status(200).json({ success: true, data: { id: product.id } });
});