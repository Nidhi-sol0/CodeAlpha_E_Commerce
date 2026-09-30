const connectDatabase = require("../config/database");
const Product = require("../models/Product");
const products = require("../data/products");
const mongoose = require("mongoose");

async function seed() {
  try {
    await connectDatabase();
    await Product.deleteMany({});
    const inserted = await Product.insertMany(products);
    console.info(`Seeded ${inserted.length} LumaCart products`);
  } catch (error) {
    console.error("Product seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();