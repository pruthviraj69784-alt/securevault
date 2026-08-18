const crypto = require("crypto");
const prisma = require("../config/prisma");
const logger = require("../utils/logger");

class WebhookService {

    async registerWebhook(userId, url, events = ["FILE_SHARED"]) {
        const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
        const webhook = await prisma.webhook.create({
            data: {
                ownerId: String(userId),
                url,
                events,
                secret
            }
        });
        return { ...webhook, _id: webhook.id };
    }

    async getWebhooks(userId) {
        const webhooks = await prisma.webhook.findMany({
            where: { ownerId: String(userId) }
        });
        return webhooks.map(w => ({ ...w, _id: w.id }));
    }

    async deleteWebhook(userId, webhookId) {
        const count = await prisma.webhook.deleteMany({
            where: { id: String(webhookId), ownerId: String(userId) }
        });
        return count.count > 0;
    }

    /**
     * Triggers webhook calls asynchronously for matching subscriptions
     */
    async triggerEvent(userId, event, data) {
        try {
            const webhooks = await prisma.webhook.findMany({
                where: {
                    ownerId: String(userId),
                    isActive: true,
                    events: { has: event }
                }
            });

            if (webhooks.length === 0) return;

            const payload = {
                event,
                user:     data.user,
                filename: data.filename,
                time:     new Date().toISOString()
            };

            const payloadString = JSON.stringify(payload);

            // Dispatch HTTP requests in the background (fire-and-forget)
            const dispatches = webhooks.map(async (webhook) => {
                try {
                    const secret = webhook.secret || "default_secret";
                    const signature = crypto
                        .createHmac("sha256", secret)
                        .update(payloadString)
                        .digest("hex");

                    const response = await fetch(webhook.url, {
                        method:  "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-SecureVault-Signature": `sha256=${signature}`
                        },
                        body: payloadString,
                        signal: AbortSignal.timeout(5000)
                    });
                    logger.info(`[WEBHOOK] Dispatched ${event} to ${webhook.url} (status: ${response.status}) [Signature: sha256=${signature.slice(0, 10)}...]`);
                } catch (err) {
                    logger.warn(`[WEBHOOK WARNING] Failed dispatching to ${webhook.url}: ${err.message}`);
                }
            });

            // Run concurrently without throwing to calling process
            Promise.all(dispatches).catch((err) => {
                logger.error(`[WEBHOOK ERROR] Concurrent dispatch failed: ${err.message}`);
            });

        } catch (err) {
            logger.error("[WEBHOOK ERROR] Querying webhooks failed:", err.message);
        }
    }

}

module.exports = new WebhookService();
