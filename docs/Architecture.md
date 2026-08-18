# SecureVault — Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [API Documentation](#api-documentation)
4. [Security Model](#security-model)
5. [Database Schema](#database-schema)

---

## Project Overview

SecureVault is a zero-knowledge encrypted file storage platform built for HACKVERSE 2026.

**Team:** HV2026-0078 | UDHBAV
**Category:** Cybersecurity / Cloud Storage

---

## Architecture

### System Components

```
Client (Browser)
  └── React 19 + Vite
  └── AES-256 Client-Side Encryption (Zero-Knowledge)
  └── WebSocket (real-time notifications)

Backend API (Node.js + Express)
  ├── /api/auth          — JWT authentication
  ├── /api/files         — upload, download, versioning
  ├── /api/shares        — public tokenized share links
  ├── /api/internal-shares — user-to-user sharing
  ├── /api/qr            — QR session management
  ├── /api/audit         — tamper-proof audit log
  └── /api/notifications — real-time alerts

Worker (BullMQ)
  └── Encrypts files (AES-256-GCM)
  └── Uploads to AWS S3
  └── Updates version status → READY

Storage
  └── AWS S3 (encrypted blobs)
  └── PostgreSQL (metadata, users, shares)
  └── Redis (BullMQ queue, OTP, QR sessions)
```

---

## API Documentation

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user profile |

### Files

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/files/upload` | Upload a file (multipart) |
| GET | `/api/files/my-files` | List all user files |
| GET | `/api/files/download/:id` | Download file |
| GET | `/api/files/:id/versions` | List file versions |
| POST | `/api/files/:id/restore` | Restore a version |
| DELETE | `/api/files/:id` | Delete file |
| PATCH | `/api/files/:id/favorite` | Toggle favorite |
| PUT | `/api/files/:id/trash` | Move to trash |
| PUT | `/api/files/:id/restore-trash` | Restore from trash |

### Shares (Public Links)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/shares` | Create share link |
| GET | `/api/shares/:token/info` | Get share metadata |
| POST | `/api/shares/:token/access` | Download via share |
| POST | `/api/shares/:token/send-otp` | Send OTP to email |
| GET | `/api/shares/my-shares` | List own shares |
| DELETE | `/api/shares/:id` | Revoke share |

### QR Sessions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/qr/create` | Generate QR session |
| GET | `/api/qr/scan/:sessionId` | Scan & download |

---

## Security Model

### Standard Encryption (Server-Side)
1. Client uploads plaintext file
2. Worker picks up job from BullMQ queue
3. Worker encrypts using `AES-256-GCM` with server-managed key
4. Encrypted blob uploaded to S3
5. IV and SHA-256 hash stored in DB
6. On download: S3 → decrypt with server key → stream to client

### Zero-Knowledge Encryption (Client-Side)
1. Client encrypts file in browser using user passphrase (AES-256-GCM via Web Crypto API)
2. Client uploads already-encrypted blob with IV + hash metadata
3. Server stores encrypted blob as-is (cannot read content)
4. On download: encrypted blob streamed to client
5. Client decrypts in browser using passphrase

### Share Security Options
- 🔑 Password protection (bcrypt hashed)
- 📱 OTP via email (Redis TTL-based)
- 🌐 IP allowlist restriction
- 🔢 Download count limit
- ⏰ Expiry date/time

---

## Database Schema

### Core Tables (PostgreSQL via Prisma)

```
User
  id, name, email, password, createdAt

File
  id, ownerId, originalName, extension, currentVersion,
  isTrashed, isFavorite, trashedAt, createdAt

FileVersion
  id, fileId, version, storedName, s3Key, size,
  mimeType, iv, hash, status(PROCESSING|READY|FAILED),
  isZeroKnowledge, createdAt

Share (Public Links)
  id, fileId, ownerId, token, expiresAt, password,
  maxDownloads, downloadCount, allowedIP,
  isPasswordEnabled, isOtpEnabled, isActive, version

InternalShare (User-to-User)
  id, ownerId, recipientId, fileId, permission,
  status, message, expiresAt, maxDownloads

AuditLog
  id, userId, action, resourceId, status, ip,
  details, recordHash, previousHash, signature

Notification
  id, userId, title, message, type, isRead,
  priority, actionUrl, metadata
```
