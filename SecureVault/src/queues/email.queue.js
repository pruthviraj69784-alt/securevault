const { Queue } = require("bullmq");
const connection = require("../config/redis");

const emailQueue = new Queue("email-queue", {
    connection,
    skipVersionCheck: true
});

module.exports = emailQueue;