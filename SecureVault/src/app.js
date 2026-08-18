require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const securityHeaders = require("./middleware/securityHeaders.middleware");
const requestId = require("./middleware/requestId.middleware");
const sentry = require("./middleware/sentry.middleware");
const { apiLimiter } = require("./middleware/rateLimiter.middleware");
const logger = require("./utils/logger");

// Routes
const authRoutes = require("./routes/auth.routes");
const fileRoutes = require("./routes/file.routes");
const shareRoutes = require("./routes/share.routes");
const auditRoutes = require("./routes/audit.routes");
const adminRoutes = require("./routes/admin.routes");
const webhookRoutes = require("./routes/webhook.routes");
const monitoringRoutes = require("./routes/monitoring.routes");
const internalShareRoutes = require("./routes/internalShare.routes");
const accessRequestRoutes = require("./routes/accessRequest.routes");
const notificationRoutes = require("./routes/notification.routes");
const qrSessionRoutes = require("./routes/qrSession.routes");

const { metricsMiddleware } = require("./utils/metrics");
const errorMiddleware = require("./middleware/error.middleware");

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");

const app = express();

const localDevOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003"
];

const configuredOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([...configuredOrigins, ...localDevOrigins]);
const localOriginRegExp = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/i;

// CORS — allow the configured origins plus any local hostname/port for dev.
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin) || localOriginRegExp.test(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["Content-Disposition", "X-Zero-Knowledge", "X-File-IV", "Content-Type"]
};

// Middlewares
app.use(cors(corsOptions));
app.use(requestId);
app.use(sentry.requestHandler);
app.use(securityHeaders);

morgan.token("id", (req) => req.id || "-");
const logFormat = process.env.NODE_ENV === "production" ?
    ":remote-addr - :id [:date[iso]] \":method :url HTTP/:http-version\" :status :res[content-length] - :response-time ms" :
    ":method :url :status :res[content-length] - :response-time ms :id";

app.use(morgan(logFormat, {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));
app.use(express.json());
app.use(apiLimiter);
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// Home Route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "🚀 SecureVault API is running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Healthy"
    });
});

// Swagger Docs
app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// API Routes
app.use("/api", monitoringRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/shares/internal", internalShareRoutes);
app.use("/api/shares/requests", accessRequestRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/qr", qrSessionRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;