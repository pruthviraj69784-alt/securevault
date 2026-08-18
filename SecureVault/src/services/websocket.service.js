const { WebSocketServer, WebSocket } = require("ws");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  init(server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws, req) => {
      try {
        const urlParams = new URLSearchParams(req.url.replace(/^[^?]*\?/, ""));
        const token = urlParams.get("token");

        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
            ws.user = decoded;
          } catch (e) {
            logger.warn(`[WSS] Invalid connection token: ${e.message}`);
          }
        }

        this.clients.add(ws);
        logger.info(`[WSS] Client connected. Total active clients: ${this.clients.size}`);

        // Send initial connection ACK
        ws.send(JSON.stringify({
          type: "SYSTEM_CONNECT",
          message: "Connected to SecureVault Real-Time Telemetry Feed",
          timestamp: new Date().toISOString()
        }));

        ws.on("close", () => {
          this.clients.delete(ws);
          logger.info(`[WSS] Client disconnected. Total active clients: ${this.clients.size}`);
        });

        ws.on("error", (err) => {
          logger.error(`[WSS ERROR] Client socket error: ${err.message}`);
          this.clients.delete(ws);
        });
      } catch (err) {
        logger.error(`[WSS ERROR] Connection handler failed: ${err.message}`);
      }
    });

    logger.info("🚀 WebSocket Telemetry Server initialized on /ws");
  }

  broadcast(eventType, payload) {
    if (!this.wss || this.clients.size === 0) return;

    const message = JSON.stringify({
      type: eventType,
      data: payload,
      timestamp: new Date().toISOString()
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          logger.warn(`[WSS BROADCAST ERROR] Failed sending to client: ${err.message}`);
        }
      }
    }
  }
}

module.exports = new WebSocketService();
