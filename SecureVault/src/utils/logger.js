const { createLogger, transports, format } = require("winston");

const logFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    process.env.NODE_ENV === "production" ?
    format.json() :
    format.combine(format.colorize(), format.simple())
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : (process.env.NODE_ENV === "production" ? "info" : "debug")),
    format: logFormat,
    transports: [new transports.Console({ stderrLevels: ["error"] })]
});

module.exports = logger;