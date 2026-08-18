const transporter = require("../config/mail");
const logger = require("../utils/logger");

class EmailService {
    async sendMail({ to, subject, html }) {
        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM || '"SecureVault" <noreply@securevault.io>',
                to,
                subject,
                html,
            });
        } catch (err) {
            // Graceful fallback for Mailtrap limit exhaustion or invalid SMTP credentials during dev
            logger.warn(`[EMAIL SERVICE] Could not deliver email to ${to} via SMTP (${err.message}). Logging message locally: Subject: "${subject}"`);
        }
    }
}

module.exports = new EmailService();