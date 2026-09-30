const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/env");
const asyncHandler = require("./asyncHandler");

const requireAuth = asyncHandler(async (request, response, next) => {
  const [scheme, token] = (request.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ success: false, error: "Authentication required" });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return response.status(401).json({ success: false, error: "Invalid or expired token" });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return response.status(401).json({ success: false, error: "Account no longer exists" });
  }

  request.user = user;
  next();
});

function requireRole(role) {
  return (request, response, next) => {
    if (request.user?.role !== role) {
      return response.status(403).json({ success: false, error: "You do not have permission to do that" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };