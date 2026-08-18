const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;

const connection = redisUrl
    ? new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
      })
    : new Redis({
          host: process.env.REDISHOST || process.env.REDIS_HOST || "127.0.0.1",
          port: Number(process.env.REDISPORT || process.env.REDIS_PORT) || 6379,
          password: process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || undefined,
          username: process.env.REDISUSER || process.env.REDIS_USER || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
      });

connection.on("connect", () => {
    if (process.env.NODE_ENV !== "test") {
        console.log("✅ Redis Connected");
    }
});

connection.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
        console.error("❌ Redis Error:", err.message);
    }
});

module.exports = connection;