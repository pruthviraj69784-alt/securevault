# HACKVERSE 2026
## Team ID: HV2026-0078 | Team: UDHBAV

| # | Member Name | Role |
|---|---|---|
| 1 | Member Name | Team Lead / Full Stack Developer |
| 2 | Member Name | Backend Developer |
| 3 | Member Name | Frontend Developer |
| 4 | Member Name | Database / DevOps Engineer |

> *(Replace with actual member names and roles)*

---

## Project Title
**SecureVault — Zero-Knowledge Encrypted File Storage & Secure Sharing Platform**

---

## Problem Statement
In today's digital world, sensitive files (medical records, legal documents, credentials) are stored on cloud platforms that have full access to user data. Breaches, unauthorized access, and insider threats put user privacy at serious risk. There is a need for a file storage system where **not even the server can read your files**.

---

## Proposed Solution
**SecureVault** is a full-stack secure file storage and sharing platform that implements:
- **Zero-Knowledge Encryption (ZKE)** — files are encrypted on the client side before upload; the server never sees plaintext data
- **End-to-End Encrypted Sharing** — share files via secure tokenized links, QR codes, or internal user-to-user sharing with granular permissions
- **Virus Scanning** — uploaded files are scanned via ClamAV before processing
- **Audit Logs** — every action is cryptographically hashed and chained for tamper-proof audit trails
- **Role-Based Access Control** — owners, recipients, and public share viewers have distinct permissions

---

## Technologies Used

### Frontend
- React 19 + Vite
- Framer Motion (animations)
- Lucide React (icons)
- TanStack Query (data fetching)
- Socket.IO Client (real-time notifications)

### Backend
- Node.js + Express.js
- Prisma ORM (PostgreSQL)
- BullMQ + Redis (background job queue)
- JWT Authentication
- Socket.IO (WebSockets)

### Storage & Security
- AWS S3 (encrypted file storage)
- AES-256-GCM (server-side encryption)
- bcrypt (password hashing)
- ClamAV (virus scanning)
- QR Code generation (qrcode library)

### Database
- PostgreSQL (primary database via Prisma)
- Redis (job queue + OTP + QR session storage)

### Deployment
- **Frontend**: Render (Static Site)
- **Backend**: Render (Web Service)
- **Database**: Render PostgreSQL
- **Cache**: Render Redis

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│   React + Vite  │  ZK Encryption (AES-256 in browser)  │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                  Express.js API                          │
│   Auth  │  Files  │  Shares  │  QR  │  WebSocket        │
└────┬──────────────┬──────────────────────────────────────┘
     │              │
┌────▼────┐   ┌─────▼──────────────────┐
│PostgreSQL│   │   BullMQ + Redis       │
│(Prisma) │   │   (File Processing     │
└─────────┘   │    Worker Queue)        │
              └──────────┬─────────────┘
                         │
              ┌──────────▼─────────────┐
              │   AWS S3 Bucket        │
              │ (AES-256 Encrypted     │
              │  Files + ZK Payloads)  │
              └────────────────────────┘
```

---

## Features

- 🔐 **Zero-Knowledge Encryption** — client-side AES-256 encryption; server never accesses plaintext
- 📤 **Secure File Upload** — with virus scanning (ClamAV) before processing
- 📥 **Encrypted Download** — server decrypts on-the-fly, ZK files decrypted in browser
- 🔗 **Public Share Links** — tokenized links with optional password, OTP, IP restriction, download limit
- 📱 **QR Code Sharing** — generate QR codes for instant mobile access
- 👥 **Internal Sharing** — share with registered users with VIEW/DOWNLOAD permissions
- 📋 **Version Control** — automatic file versioning with restore capability
- 🗑️ **Trash Bin** — soft-delete with recovery support
- ⭐ **Favorites** — mark and filter important files
- 🔔 **Real-time Notifications** — WebSocket-powered live alerts
- 📊 **File Insights** — per-file analytics (downloads, shares, size)
- 🛡️ **Tamper-Proof Audit Log** — SHA-256 chained audit trail
- 📈 **Storage Dashboard** — usage statistics and activity graphs

---

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- AWS S3 bucket (or mock with LocalStack)

### Clone the Repository
```bash
git clone https://github.com/HACKVERSE-2026/HV-0078-UDHBAV.git
cd HV-0078-UDHBAV
```

### Backend Setup
```bash
cd SecureVault
npm install
cp .env.example .env
# Fill in your environment variables in .env
npx prisma migrate deploy
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL to your backend URL
npm run dev
```

---

## Environment Variables

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/securevault
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=ap-south-1
ENCRYPTION_KEY=64-char-hex-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

> ⚠️ **Never commit `.env` files. They are in `.gitignore`.**

---

## How to Run

### Development (both servers)
```bash
# Terminal 1 — Backend
cd SecureVault
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

App runs at: **http://localhost:3000**

---

## Demo

| Link | URL |
|---|---|
| 🌐 Live Demo | https://securevault-app.onrender.com |
| 🎥 Demo Video | *[Add URL]* |

---

## Deployment

The application is deployed on **Render**:

| Service | URL |
|---|---|
| Frontend (Static) | https://securevault-app.onrender.com |
| Backend (Web Service) | https://securevault-api.onrender.com |
| PostgreSQL | Render managed DB |
| Redis | Render Key-Value store |

See [`deployment/deployment-instructions.md`](deployment/deployment-instructions.md) for full deployment guide.

---

## Screenshots

> Add screenshots in `assets/screenshots/`

| Screen | Description |
|---|---|
| Dashboard | File manager with storage stats |
| Upload | Drag-and-drop with ZK encryption toggle |
| Share Modal | Configure password, OTP, expiry, IP lock |
| QR Share | QR code for mobile scanning |
| Audit Log | Tamper-proof activity chain |

---

## Submission Checklist

- [x] README.md complete
- [x] Source code pushed
- [ ] Project Report added to `docs/`
- [ ] PPT added to `docs/`
- [x] Demo URL added → https://securevault-app.onrender.com
- [ ] Demo Video URL added
- [x] Deployment Instructions added
- [x] `.env` NOT committed (secrets safe)
- [ ] Final tag created: `v1.0-final`

---

## Future Enhancements

- 🤖 AI-powered file classification and smart search
- 🔑 Hardware security key (FIDO2/WebAuthn) support
- 📁 Folder organization and nested directory support
- 🌍 Multi-region S3 replication for geo-redundancy
- 📧 Email delivery of shared files
- 🧩 Browser extension for one-click encryption
- 📱 Native mobile app (React Native)

---

## License

MIT License — see [`LICENSE`](LICENSE) for details.

---

*Built with ❤️ by Team UDHBAV for HACKVERSE 2026*
