# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install only production deps in this stage
COPY package*.json ./
RUN npm install --omit=dev

# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:22-alpine AS production

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy node_modules from builder (no dev deps)
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create uploads directory and set ownership
RUN mkdir -p uploads && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 5000

# Health check so orchestrators can verify liveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start the production server
CMD ["node", "server.js"]