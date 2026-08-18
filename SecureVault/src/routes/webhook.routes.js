const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const webhookController = require("../controllers/webhook.controller");

const { createWebhookValidation } = require("../Validation/webhook.validator");

router.use(authMiddleware);

router.post("/", createWebhookValidation, webhookController.create);
router.get("/", webhookController.list);
router.delete("/:id", webhookController.delete);

module.exports = router;
