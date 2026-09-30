const mongoose = require("mongoose");
const config = require("./env");

async function connectDatabase() {
  await mongoose.connect(config.mongoUri);
  console.info("Connected to MongoDB");
}

module.exports = connectDatabase;