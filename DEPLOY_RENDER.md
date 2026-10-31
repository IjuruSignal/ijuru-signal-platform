# Render Deployment Guide — Ijuru Signal

This guide walks through deploying **Ijuru Signal** to [Render](https://render.com) using a **single Docker container** that hosts both the Next.js frontend UI and the backend API routes with zero extra services needed.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │                 Render Cloud                 │
                      │                                              │
                      │   HTTPS Request (port 443)                   │
                      │          │                                   │
                      │          ▼                                   │
                      │   Render Ingress Router (TLS termination)    │
                      │          │                                   │
                      │          ▼  (internal $PORT, e.g. 10000)     │
                      │   ┌──────────────────────────────────────┐   │
                      │   │  Single Docker Container             │   │
                      │   │                                      │   │
                      │   │  ┌────────────────────────────────┐  │   │
                      │   │  │ Next.js 15 App (Front & Back)  │  │   │
                      │   │  │  - Desktop/Mobile UI           │  │   │
                      │   │  │  - 30 Districts Map & Briefing │  │   │
                      │   │  │  - API Routes & AI Copilot     │  │   │
                      │   │  │  - Field Checks Triage         │  │   │
                      │   │  └───────────────┬────────────────┘  │   │
                      │   │                  │                   │   │
                      │   │  ┌───────────────▼────────────────┐  │   │
                      │   │  │ Persistent SQLite (/app/data)  │  │   │
                      │   │  │ OR Render Postgres (DATABASE_URL) │   │
                      │   │  └────────────────────────────────┘  │   │
                      │   └──────────────────────────────────────┘   │
                      └──────────────────────────────────────────────┘
```

---

## Method 1: 1-Click / Blueprint Deploy (Recommended)

1. Fork or push this repository to your GitHub/GitLab account.
2. In your Render Dashboard, click **New +** → **Blueprint**.
3. Select your repository. Render will detect `render.yaml` automatically.
4. Render will prompt you for:
   - `OPENROUTER_API_KEY`: Paste your OpenRouter API key (`sk-or-v1-...`).
5. Click **Apply**. Render builds the Dockerfile, runs database migrations, auto-seeds Rwanda district data, and starts the service.

---

## Method 2: Manual Web Service Setup

If you prefer to configure manually via the Render UI:

1. In Render Dashboard, click **New +** → **Web Service**.
2. Select your Git repository.
3. Choose **Docker** as the Runtime (Render will automatically use the root `Dockerfile`).
4. Select your Region (e.g. Frankfurt or Oregon).
5. Choose your Plan (Free or Starter).
6. Under **Advanced Settings**, configure the **Environment Variables** below.

---

## Environment Variables Reference

| Variable | Required? | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables optimized production execution. |
| `OPENROUTER_API_KEY` | Optional | `sk-or-v1-xxxxxxxx...` | Enables the grounded Climate AI Assistant via OpenRouter. |
| `ADMIN_INITIAL_PASSWORD` | Recommended | `Admin_Pass_2026!` | Password for the pre-seeded admin user (`admin@ijuru.rw`). |
| `SESSION_SECRET` | Recommended | `32-random-hex-characters...` | Secret key for HMAC session cookies. Auto-generated if omitted. |
| `DATABASE_URL` | Optional | `postgresql://user:pass@host:5432/db` | **Optional.** If set (e.g. Render Postgres), the app automatically switches from SQLite to PostgreSQL. |
| `SQLITE_PATH` | Optional | `/app/data/app.sqlite` | Path for SQLite database file if not using PostgreSQL. |
| `AUTO_SEED` | Optional | `true` | Automatically seeds all 30 Rwanda districts and initial demo data if database is empty. |

> [!NOTE]
> **No Frontend URL configuration is required!**
> Because Next.js serves both the frontend web app and backend `/api/*` endpoints from the same process, all API calls use relative paths (e.g., `/api/signals/kigali`, `/api/places/search`).

---

## Choosing Your Database Strategy

### Option A: SQLite (Default — Free & Simplest)
- Requires zero setup, zero extra services, and zero monthly database costs.
- The entrypoint script creates the SQLite database at `/app/data/app.sqlite` and runs migrations automatically.
- **For persistent data between redeploys**:
  In Render service settings, go to **Disks** → **Add Disk**:
  - Name: `ijuru-data`
  - Mount Path: `/app/data`
  - Size: 1 GB (plenty for thousands of observations)

### Option B: Render PostgreSQL
- If you prefer a managed PostgreSQL database:
  1. Click **New +** → **PostgreSQL** in Render.
  2. Copy the **Internal Database URL**.
  3. In your Web Service environment variables, add:
     - `DATABASE_URL` = `<pasted PostgreSQL URL>`
  4. The container automatically detects `DATABASE_URL`, runs all Postgres migrations, seeds the data, and connects securely.

---

## Verifying Deployment

Once Render finishes deploying:

1. **Health Check Endpoint**:
   Visit `https://<your-render-subdomain>.onrender.com/api/health`
   You should see:
   ```json
   {
     "status": "healthy",
     "db": "connected",
     "provider": "sqlite",
     "timestamp": "2026-10-31T..."
   }
   ```

2. **Explore the App**:
   - `https://<your-app>.onrender.com/` — National 30-district interactive map and climate indicators.
   - `https://<your-app>.onrender.com/places/kigali` — Deep district briefing.
   - `https://<your-app>.onrender.com/field-checks` — Field observations triage & logging.
   - `https://<your-app>.onrender.com/assistant` — Climate AI Assistant with OpenRouter integration.
   - `https://<your-app>.onrender.com/admin` — Admin management dashboard.
   - `https://<your-app>.onrender.com/sign-in` — Sign-in or 1-click guest role switcher.

3. **Pre-configured Accounts**:
   - **Administrator**: `admin@ijuru.rw` (Password: value of `ADMIN_INITIAL_PASSWORD` or `admin12345678`)
   - **Agronomist Reviewer**: `reviewer@ijuru.rw` (Password: `demo12345678`)
   - **Field Worker**: `field@ijuru.rw` (Password: `demo12345678`)
   - Or click any role under **Instant 1-Click Access** on the sign-in page without entering a password.
