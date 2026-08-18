const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { getMetrics } = require("../utils/metrics");

/**
 * GET /api/health
 * Returns a rich health report including DB, memory, and uptime.
 */
router.get("/health", async (req, res) => {
    let dbStatus = "UP";
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        dbStatus = "DOWN";
    }

    let redisStatus = "UP";
    try {
        await redis.ping();
    } catch {
        redisStatus = "DOWN";
    }

    const isHealthy = dbStatus === "UP" && redisStatus === "UP";
    const status = isHealthy ? "UP" : "DEGRADED";
    const mem = process.memoryUsage();
    const uptimeMs = process.uptime() * 1000;

    res.status(isHealthy ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: {
            ms:    Math.floor(uptimeMs),
            human: formatUptime(uptimeMs)
        },
        checks: {
            database: {
                status: dbStatus,
                name:   "PostgreSQL (securevault)"
            },
            redis: {
                status: redisStatus
            }
        },
        memory: {
            rss:       formatBytes(mem.rss),
            heapUsed:  formatBytes(mem.heapUsed),
            heapTotal: formatBytes(mem.heapTotal)
        },
        nodeVersion: process.version
    });
});

/**
 * GET /api/metrics
 * Returns in-memory request/error counters.
 */
router.get("/metrics", (req, res) => {
    res.status(200).json(getMetrics());
});

const formatUptime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
};

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

module.exports = router;
