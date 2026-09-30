const express = require("express");
const controller = require("../controllers/product.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", controller.listProducts);
router.get("/:id", controller.getProduct);
router.post("/", requireAuth, requireRole("admin"), controller.createProduct);
router.put("/:id", requireAuth, requireRole("admin"), controller.updateProduct);
router.delete("/:id", requireAuth, requireRole("admin"), controller.deleteProduct);

module.exports = router;