/**
 * In-memory metrics store
 * Tracks: request count per route, error count, server start time
 */
const metrics = {
    startTime: Date.now(),
    requestCount: 0,
    errorCount: 0,
    requestsByStatus: {}
};

/**
 * Middleware: increments requestCount and tracks status codes
 */
const metricsMiddleware = (req, res, next) => {
    metrics.requestCount++;

    res.on("finish", () => {
        const status = res.statusCode;
        metrics.requestsByStatus[status] = (metrics.requestsByStatus[status] || 0) + 1;
        if (status >= 500) {
            metrics.errorCount++;
        }
    });

    next();
};

/**
 * Returns a snapshot of current metrics
 */
const getMetrics = () => {
    const uptimeMs = Date.now() - metrics.startTime;
    const mem = process.memoryUsage();

    return {
        uptime: {
            ms: uptimeMs,
            human: formatUptime(uptimeMs)
        },
        requests: {
            total: metrics.requestCount,
            byStatus: metrics.requestsByStatus
        },
        errors: {
            total: metrics.errorCount
        },
        memory: {
            rss:       formatBytes(mem.rss),
            heapUsed:  formatBytes(mem.heapUsed),
            heapTotal: formatBytes(mem.heapTotal),
            external:  formatBytes(mem.external)
        },
        nodeVersion: process.version,
        platform:    process.platform
    };
};

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

module.exports = { metricsMiddleware, getMetrics };
