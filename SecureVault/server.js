require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/database");
const mongoose = require("mongoose");
const redis = require("./src/config/redis");

const PORT = process.env.PORT || 5000;

let server;
let worker;
let emailWorker;

async function startServer() {
    try {
        const dbReady = await connectDB();

        if (!dbReady) {
            console.warn("⚠️ MongoDB unavailable; continuing without database-backed routes");
        }

        if (process.env.NODE_ENV !== "test") {
            try {
                worker = require("./src/workers/file.worker");
                emailWorker = require("./src/workers/email.worker");
            } catch (workerErr) {
                console.warn("⚠️ Worker startup skipped:", workerErr.message);
            }
        }

        server = app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
        });

        const websocketService = require("./src/services/websocket.service");
        websocketService.init(server);

    } catch (err) {
        console.error("❌ Server startup failed:", err.message);
        process.exit(1);
    }
}

async function gracefulShutdown(signal) {

    console.log(`\n[SERVER] ${signal} received. Shutting down...`);

    try {

        if (server) {
            await new Promise(resolve => server.close(resolve));
            console.log("✅ HTTP Server Closed");
        }

        if (worker) {
            await worker.close();
            console.log("✅ File Worker Closed");
        }

        if (emailWorker) {
            await emailWorker.close();
            console.log("✅ Email Worker Closed");
        }

        await redis.quit();
        console.log("✅ Redis Closed");

        await mongoose.disconnect();
        console.log("✅ MongoDB Closed");

        process.exit(0);

    } catch (err) {

        console.error(err);
        process.exit(1);

    }
}

if (process.env.NODE_ENV !== "test") {

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    process.on("unhandledRejection", err => {
        console.error(err);
        process.exit(1);
    });

    process.on("uncaughtException", err => {
        console.error(err);
        process.exit(1);
    });

    startServer();
}

module.exports = startServer;