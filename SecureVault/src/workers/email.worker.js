const { Worker } = require("bullmq");

const connection = require("../config/redis");
const emailService = require("../services/email.service");

const logger = require("../utils/logger");

const emailWorker = new Worker(
    "email-queue",
    async (job) => {
        await emailService.sendMail(job.data);
        logger.info(`[EMAIL WORKER] ✉ Email sent to ${job.data.to}`);
    },
    {
        connection,
        skipVersionCheck: true
    }
);

emailWorker.on("failed", (job, err) => {
    logger.error(`[EMAIL WORKER] Job ${job?.id} failed: ${err.message}`);
});

module.exports = emailWorker;