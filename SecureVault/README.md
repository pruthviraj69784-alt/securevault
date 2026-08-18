# SecureVault API

SecureVault is an Express API for encrypted file storage, versioning, sharing,
audit trails, webhooks, background processing, and S3-compatible storage.

## Prerequisites

- Node.js 22+
- MongoDB 8+
- Redis 7+
- ClamAV (required in production)
- An S3 bucket and credentials

## Setup

1. Copy .env.example to .env and replace every placeholder.
2. Install dependencies with npm ci.
3. Start MongoDB, Redis, and ClamAV, or use Docker Compose with
   docker compose up --build.

The API listens on http://localhost:5000. Interactive API documentation is
available at /api/docs.

## Required configuration

| Variable | Purpose |
| --- | --- |
| JWT_SECRET | A long, randomly generated signing secret. |
| ENCRYPTION_KEY | Exactly 32 UTF-8 bytes; used for server-side file encryption. |
| MONGO_URI | MongoDB connection URI. |
| REDIS_HOST and REDIS_PORT | Redis/BullMQ connection. |
| AWS_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY | Object storage configuration. |
| CLAMAV_HOST and CLAMAV_PORT | Malware scanner endpoint. |

Generate a compatible encryption key with:
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"

Optional hardening settings:

- MAX_UPLOAD_SIZE_BYTES defaults to 104857600 (100 MiB).
- UPLOAD_DIR selects the temporary upload directory.
- CORS_ORIGIN is a comma-separated allowlist of browser origins.
- JWT_EXPIRES_IN defines access-token lifetime.

## Security and operations

- New server-encrypted files use AES-256-GCM with a versioned file format and
  authenticated integrity protection. Existing AES-CBC files remain readable
  for a staged migration.
- Never commit .env, uploads, production database dumps, or S3 credentials.
- Back up MongoDB and S3 independently and test restoration regularly.
- Rotate JWT and encryption keys through a documented, staged process. Keep the
  previous encryption key available until all legacy files are re-encrypted.
- Run ClamAV in production; do not set a fail-open scanner policy.

## Quality checks

Run npm run lint and npm test before release. GitHub Actions runs both commands
before Docker build and publishing.
