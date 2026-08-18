const redis = require("../src/config/redis");

afterAll(async () => {
    if (redis.status !== "end") {
        await redis.quit();
    }
});
