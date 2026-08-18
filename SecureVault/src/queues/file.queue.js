const { Queue } = require("bullmq");
const redisConfig = require("../config/redis");

const fileQueue = new Queue("file-processing", {
    connection: redisConfig,
    skipVersionCheck: true
});

module.exports = fileQueue;
