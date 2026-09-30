const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 40 },
  line1: { type: String, trim: true, maxlength: 120 },
  line2: { type: String, trim: true, maxlength: 120 },
  city: { type: String, trim: true, maxlength: 80 },
  region: { type: String, trim: true, maxlength: 80 },
  postalCode: { type: String, trim: true, maxlength: 20 },
  country: { type: String, trim: true, maxlength: 80 },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  addresses: { type: [addressSchema], default: [] }
}, { timestamps: true });

userSchema.pre("save", async function hashPassword() {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    addresses: this.addresses,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model("User", userSchema);