const express = require("express");
const controller = require("../controllers/order.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.post("/", controller.createOrder);
router.get("/", controller.listOrders);
router.patch("/:id/cancel", controller.cancelOrder);
router.get("/:id", controller.getOrder);

module.exports = router;