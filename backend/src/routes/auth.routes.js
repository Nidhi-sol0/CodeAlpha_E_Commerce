const express = require("express");
const controller = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/logout", requireAuth, controller.logout);
router.get("/me", requireAuth, controller.currentUser);
router.patch("/profile", requireAuth, controller.updateProfile);

module.exports = router;