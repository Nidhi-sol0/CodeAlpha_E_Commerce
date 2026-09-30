const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const requiredVariables = ["MONGODB_URI", "JWT_SECRET"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(", ")}`);
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

function nonNegativeSetting(name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, maximum) : fallback;
}

module.exports = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5500",
  freeShippingThreshold: nonNegativeSetting("ORDER_FREE_SHIPPING_THRESHOLD", 100),
  shippingFee: nonNegativeSetting("ORDER_SHIPPING_FEE", 8.95),
  taxRate: nonNegativeSetting("ORDER_TAX_RATE", 0.08, 1)
});