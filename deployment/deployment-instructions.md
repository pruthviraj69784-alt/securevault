# HACKVERSE 2026 — Deployment Instructions
## Team HV2026-0078 | UDHBAV | SecureVault

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Job queue & sessions |
| AWS Account | — | S3 file storage |

---

## 1. Render Deployment (Current Production)

### Services Created on Render

| Service Type | Name | Purpose |
|---|---|---|
| Web Service | `securevault-api` | Node.js backend |
| Static Site | `securevault-app` | React frontend |
| PostgreSQL | `securevault-db` | Database |
| Key-Value (Redis) | `securevault-redis` | Queue & cache |

---

### Step 1: Deploy Database & Redis

1. Go to [render.com](https://render.com) → **New → PostgreSQL**
   - Name: `securevault-db`
   - Copy the **Internal Database URL** for backend env vars

2. Go to **New → Redis** (Key-Value)
   - Name: `securevault-redis`
   - Copy the **Internal Redis URL**

---

### Step 2: Deploy Backend

1. Go to **New → Web Service**
2. Connect GitHub repo → select this repository
3. Settings:
   - **Root Directory**: `SecureVault`
   - **Build Command**: `npm install && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. Add these Environment Variables:

```
DATABASE_URL         = (from PostgreSQL service - Internal URL)
REDIS_URL            = (from Redis service - Internal URL)
JWT_SECRET           = (generate: openssl rand -hex 64)
JWT_EXPIRES_IN       = 7d
ENCRYPTION_KEY       = (generate: openssl rand -hex 64)
AWS_ACCESS_KEY_ID    = (your AWS key)
AWS_SECRET_ACCESS_KEY= (your AWS secret)
AWS_BUCKET_NAME      = (your S3 bucket)
AWS_REGION           = ap-south-1
NODE_ENV             = production
FRONTEND_URL         = https://securevault-app.onrender.com
```

---

### Step 3: Deploy Frontend

1. Go to **New → Static Site**
2. Connect same GitHub repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Add Environment Variable:
```
VITE_API_URL = https://securevault-api.onrender.com/api
```

---

### Step 4: Verify Deployment

```bash
# Check backend health
curl https://securevault-api.onrender.com/health

# Should return:
# {"status":"ok","timestamp":"..."}
```

---

## 2. Local Development Setup

```bash
# 1. Clone
git clone https://github.com/HACKVERSE-2026/HV-0078-UDHBAV.git
cd HV-0078-UDHBAV

# 2. Backend
cd SecureVault
npm install
cp .env.example .env
# Edit .env with your local values
npx prisma migrate dev
npm run dev        # Starts on port 5000

# 3. Frontend (new terminal)
cd ../frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm run dev        # Starts on port 3000
```

---

## 3. Final Submission Tag

After finalizing the project, create a release tag:

```bash
git add .
git commit -m "Final submission - HACKVERSE 2026"
git tag -a v1.0-final -m "HACKVERSE 2026 Final Submission - Team UDHBAV"
git push origin main
git push origin v1.0-final
```

---

## Production URLs

| | URL |
|---|---|
| Frontend | https://securevault-app.onrender.com |
| Backend API | https://securevault-api.onrender.com |
| Health Check | https://securevault-api.onrender.com/health |
