const emailQueue = require("../queues/email.queue");

class EmailJob {
    async send(data) {
        await emailQueue.add("send-email", data, {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 3000,
            },
        });
    }
}

module.exports = new EmailJob();