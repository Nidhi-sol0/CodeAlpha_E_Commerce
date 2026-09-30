const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config/env");
const productRoutes = require("./routes/product.routes");
const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/order.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.get("/api/health", (request, response) => {
  response.status(200).json({ success: true, data: { status: "ok" } });
});

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);

app.use((request, response) => {
  response.status(404).json({ success: false, error: "Route not found" });
});

app.use((error, request, response, next) => {
  console.error(error);
  const statusCode = error.statusCode
    || (error.name === "ValidationError" ? 400 : 0)
    || (error.code === 11000 ? 409 : 0)
    || (error.name === "CastError" ? 400 : 500);
  response.status(statusCode).json({
    success: false,
    error: config.nodeEnv === "production" ? "Internal server error" : error.message,
    ...(config.nodeEnv !== "production" && error.details ? { details: error.details } : {})
  });
});

module.exports = app;