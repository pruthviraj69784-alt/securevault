const webhookService = require("../services/webhook.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../Error/AppError");

class WebhookController {

    create = asyncHandler(async (req, res) => {
        const { url, events } = req.body;

        if (!url) {
            throw new AppError("url is required", 400);
        }

        const webhook = await webhookService.registerWebhook(
            req.user._id,
            url,
            events
        );

        res.status(201).json({
            success: true,
            message: "Webhook registered successfully",
            data: webhook
        });
    });

    list = asyncHandler(async (req, res) => {
        const webhooks = await webhookService.getWebhooks(req.user._id);

        res.status(200).json({
            success: true,
            data: webhooks
        });
    });

    delete = asyncHandler(async (req, res) => {
        const webhook = await webhookService.deleteWebhook(
            req.user._id,
            req.params.id
        );

        if (!webhook) {
            throw new AppError("Webhook not found", 404);
        }

        res.status(200).json({
            success: true,
            message: "Webhook deleted successfully",
            data: webhook
        });
    });

}

module.exports = new WebhookController();
