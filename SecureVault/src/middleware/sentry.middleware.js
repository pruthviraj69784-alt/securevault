const Sentry = require("@sentry/node");

const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
        attachStacktrace: true
    });
}

module.exports = {
    requestHandler: sentryDsn ? Sentry.Handlers.requestHandler() : (req, res, next) => next(),
    errorHandler: sentryDsn ? Sentry.Handlers.errorHandler() : (err, req, res, next) => next(err),
    captureException: (error) => {
        if (sentryDsn) {
            Sentry.captureException(error);
        }
    }
};