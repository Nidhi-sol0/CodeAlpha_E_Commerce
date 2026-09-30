const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/env");
const asyncHandler = require("../middleware/asyncHandler");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function validName(name) {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 80;
}

exports.register = asyncHandler(async (request, response) => {
  const { name, email, password, confirmPassword } = request.body;
  if (!validName(name) || typeof email !== "string" || !emailPattern.test(email.trim())) {
    return response.status(400).json({ success: false, error: "Enter a valid name and email address" });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return response.status(400).json({ success: false, error: "Password must be between 8 and 72 characters" });
  }
  if (password !== confirmPassword) {
    return response.status(400).json({ success: false, error: "Passwords do not match" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return response.status(409).json({ success: false, error: "An account with this email already exists" });
  }

  const user = await User.create({ name: name.trim(), email: normalizedEmail, password });
  response.status(201).json({ success: true, data: { user: user.toSafeObject(), token: issueToken(user) } });
});

exports.login = asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  if (typeof email !== "string" || !emailPattern.test(email.trim()) || typeof password !== "string") {
    return response.status(400).json({ success: false, error: "Enter a valid email and password" });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return response.status(401).json({ success: false, error: "Email or password is incorrect" });
  }
  response.json({ success: true, data: { user: user.toSafeObject(), token: issueToken(user) } });
});

exports.currentUser = asyncHandler(async (request, response) => {
  response.json({ success: true, data: { user: request.user.toSafeObject() } });
});

exports.updateProfile = asyncHandler(async (request, response) => {
  const updates = {};
  if (request.body.name !== undefined) {
    if (!validName(request.body.name)) {
      return response.status(400).json({ success: false, error: "Name must be between 2 and 80 characters" });
    }
    updates.name = request.body.name.trim();
  }
  if (request.body.email !== undefined) {
    if (typeof request.body.email !== "string" || !emailPattern.test(request.body.email.trim())) {
      return response.status(400).json({ success: false, error: "Enter a valid email address" });
    }
    updates.email = request.body.email.trim().toLowerCase();
  }
  if (Object.keys(updates).length === 0) {
    return response.status(400).json({ success: false, error: "Provide a name or email to update" });
  }

  const user = await User.findByIdAndUpdate(request.user.id, updates, { new: true, runValidators: true });
  response.json({ success: true, data: { user: user.toSafeObject() } });
});

exports.logout = (request, response) => {
  response.json({ success: true, data: { message: "Signed out. Remove the token from this device." } });
};