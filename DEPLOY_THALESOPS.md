# Ijuru Signal — ThalesOps & Production Deployment Guide

This guide details production deployment for **Ijuru Signal** on **ThalesOps** (via `thalesops-agent` with Docker or Nixpacks), standard Docker environments, and hybrid split architectures (Vercel frontend + ThalesOps backend).

---

## 1. Architecture Overview

Ijuru Signal is engineered as a unified Next.js App Router application backed by a dual-engine persistence layer:
- **Default Database**: Local durable **SQLite** (running natively via `node:sqlite` in Node 24). Fast, zero external infrastructure, backed by atomic snapshots (`VACUUM INTO`).
- **Production Scale Database**: Optional verified **PostgreSQL 18** adapter with connection pooling (`pg`), table-level transactions, and dual-dialect SQL migrations.
- **AI Synthesis**: OpenAI-compatible streaming engine (grounded with OpenRouter, Anthropic, or OpenAI endpoints) or deterministic offline synthesis.

```mermaid
flowchart TD
    subgraph Internet
        UserBrowser["User / Field Worker (Browser / Mobile PWA)"]
        OpenRouterAPI["OpenRouter API (openrouter.ai)"]
        OpenMeteo["Open-Meteo & Satellite APIs"]
    end

    subgraph Host ["ThalesOps Host (VPS / Cloud Node)"]
        Caddy["Caddy / Nginx Reverse Proxy (Automatic TLS / Let's Encrypt)"]
        
        subgraph DockerNetwork ["Docker Network: ijuru-signal"]
            App["Ijuru Signal Next.js (Node 24)<br/>scripts/docker-entrypoint.sh<br/>Port 3000"]
            PG["PostgreSQL 18 Alpine (Optional)<br/>Port 5432"]
        end

        DataVol["Persistent Volume: /app/data<br/>(app.sqlite + backups)"]
        PGVol["Persistent Volume: pgdata<br/>(/var/lib/postgresql/data)"]
    end

    UserBrowser -->|HTTPS :443| Caddy
    Caddy -->|HTTP :3000| App
    App -->|Durable I/O| DataVol
    App -.->|DB_PROVIDER=postgres| PG
    PG -->|Durable Blocks| PGVol
    App -->|SSL Outbound| OpenRouterAPI
    App -->|SSL Outbound| OpenMeteo
```

---

## 2. Deployment Models

### Option A: All-in-One on ThalesOps (Recommended)
Both frontend pages and backend API routes run in a single container managed by `thalesops-agent`. SQLite data lives on a persistent volume mount (`/app/data`), yielding minimal maintenance overhead, zero latency, and zero cloud database costs.

### Option B: All-in-One with PostgreSQL 18
Runs the Next.js app container and PostgreSQL 18 container side-by-side using `docker-compose.yml` on ThalesOps. Data is stored in the `pgdata` volume.

### Option C: Split Deployment (Vercel + ThalesOps)
- **Frontend / Edge**: Next.js UI deployed on **Vercel** with CDN edge caching for static assets.
- **Backend / Database**: API routes and durable persistence deployed on **ThalesOps** running Docker or Nixpacks.
- **Routing**: Configured via `vercel.json` rewrites (`/api/:path* -> https://backend.your-domain.rw/api/:path*`) or unified custom domain routing.

---

## 3. ThalesOps Agent Configuration

ThalesOps automatically identifies the deployment strategy via repository configuration files:
- If `nixpacks.toml` is present, `thalesops-agent` builds a reproducible Nix container with Node 24 and pnpm.
- If `Dockerfile` is present, `thalesops-agent` builds the multi-stage OCI container.

### Step 1: Environment Variables in ThalesOps Dashboard
Configure the following environment variables in your ThalesOps application console:

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Production mode |
| `PORT` | No | `3000` | HTTP port exposed inside container |
| `DB_PROVIDER` | No | `sqlite` | Persistence engine: `sqlite` or `postgres` |
| `SQLITE_PATH` | SQLite only | `/app/data/app.sqlite` | Path to persistent SQLite database file |
| `DATABASE_URL` | Postgres only | - | Connection string: `postgresql://user:pass@host:5432/dbname` |
| `OPENROUTER_API_KEY` | Optional | - | OpenRouter API Key for AI synthesis |
| `AI_PROVIDER` | Optional | `openai-compatible` | `openai-compatible`, `anthropic`, or `disabled` |
| `AI_MODEL` | Optional | `openai/gpt-4o-mini` | AI Model identifier on OpenRouter/OpenAI |
| `AI_BASE_URL` | Optional | `https://openrouter.ai/api/v1` | Provider endpoint URL |
| `AI_ALLOWED_HOSTS` | Optional | `openrouter.ai` | Strict domain allowlist for outbound AI calls |
| `AUTO_SEED` | No | `true` | Auto-seed districts and demo users if database is empty |

> [!TIP]
> Setting `OPENROUTER_API_KEY` automatically configures OpenRouter defaults (`AI_PROVIDER=openai-compatible`, `AI_BASE_URL=https://openrouter.ai/api/v1`, and `AI_ALLOWED_HOSTS=openrouter.ai`) in `scripts/docker-entrypoint.sh` if not already set.

### Step 2: Persistent Storage Volume
In the ThalesOps volume settings, bind a host directory or persistent storage volume to `/app/data`:
- **Mount Path**: `/app/data`
- **Permissions**: Read/Write
This ensures the SQLite database (`app.sqlite`) and atomic snapshots (`VACUUM INTO`) persist across deployments and container rebuilds.

### Step 3: Reverse Proxy & Automatic HTTPS (Caddy / Nginx)
ThalesOps automatically provisions Let's Encrypt certificates. If configuring Caddy manually:

```caddyfile
signal.ijuru.rw {
    encode gzip zstd

    # Health check bypass
    handle /api/health {
        reverse_proxy app:3000
    }

    # Pass all traffic to Next.js
    handle {
        reverse_proxy app:3000 {
            header_up X-Forwarded-Proto https
            header_up X-Real-IP {remote_host}
        }
    }
}
```

### Step 4: Health Check Probes
Configure ThalesOps or your load balancer to probe:
- **Endpoint**: `GET /api/health`
- **Expected Status**: `200 OK`
- **Payload Response**:
  ```json
  {
    "status": "ok",
    "database": "sqlite",
    "aiConfigured": true,
    "timestamp": "2026-10-31T15:30:00.000Z"
  }
  ```

---

## 4. One-Command Docker Compose Deployment

To run Ijuru Signal on any VPS or Linux host with Docker Compose:

### Default (SQLite Durable Engine):
```bash
# 1. Clone repository
git clone https://github.com/your-org/ijuru-signal.git
cd ijuru-signal

# 2. Configure environment
cat << 'EOF' > .env
PORT=3000
DB_PROVIDER=sqlite
SQLITE_PATH=/app/data/app.sqlite
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
AUTO_SEED=true
EOF

# 3. Create persistent data directory with proper permissions
mkdir -p data && chmod 777 data

# 4. Launch container
docker compose up -d --build

# 5. Check logs & health
docker compose logs -f app
curl -i http://localhost:3000/api/health
```

### With PostgreSQL 18:
```bash
# Launch both app and PostgreSQL 18
docker compose --profile postgres up -d --build

# Inspect Postgres health
docker compose exec postgres pg_isready -U postgres -d ijuru_signal
```

---

## 5. Database & Migrations Lifecycle

Ijuru Signal employs dual-dialect versioned migrations with full parity between SQLite and PostgreSQL.

### Versioned Migration Files
Migrations are stored in:
- `server/db/migrations/sqlite/` (`001_initial.sql` through `008_area_access_audit.sql`)
- `server/db/migrations/postgres/` (`001_initial.sql` through `008_area_access_audit.sql`)

| Version | Scope |
|---|---|
| `001_initial.sql` | Core tables: `areas`, `users`, `field_checks`, `schema_migrations` |
| `002_jobs.sql` | Background job execution & telemetry table |
| `003_job_retry.sql` | Retries and error backoff tracking |
| `004_auth.sql` | Scrypt password hashes, sessions, and lockout tracking |
| `005_evidence.sql` | Satellite & observation evidence records |
| `006_area_boundaries.sql` | GeoJSON boundary storage & provenance metadata |
| `007_evidence_boundaries.sql` | Evidence boundary reference indexing |
| `008_area_access_audit.sql` | Admin RBAC area grant audit logging |

### Automatic Execution on Boot
When the container boots, `scripts/docker-entrypoint.sh` executes:
1. `node scripts/db-migrate.ts`: Queries `schema_migrations` and applies pending migrations sequentially within transactions.
2. **Auto-Seed Check**: If the database has no records in `areas` or `AUTO_SEED=true`, it runs `node scripts/db-seed.ts`.
3. `exec npx next start`: Starts the Next.js production server.

### Manual CLI Operations Inside Container
Execute database maintenance commands at any time using `docker compose exec`:

#### 1. Manual Migration Check
```bash
docker compose exec app pnpm db:migrate
```

#### 2. Re-Seed Districts & Seed Users
Populates Rwanda's 30 districts, boundaries, demo users (`admin@ijuru.rw`, `reviewer@ijuru.rw`, `field@ijuru.rw`), and sample field checks:
```bash
docker compose exec app pnpm db:seed
```

#### 3. Atomic SQLite Backup (`VACUUM INTO`)
Creates a consistent, point-in-time snapshot with restrictive permissions (`0600`), safe to run while the application is actively serving requests:
```bash
docker compose exec app pnpm db:backup /app/data/backup-$(date +%Y%m%d-%H%M%S).sqlite
```

#### 4. Live Engine Data Transfer (`db:transfer`)
Transfer all live data between SQLite and PostgreSQL with **cryptographic SHA-256 table-row checksum verification**:
```bash
# Transfer from SQLite to PostgreSQL with clean target table purge:
docker compose exec app pnpm db:transfer --from sqlite --to postgres --clean

# Transfer from PostgreSQL to SQLite:
docker compose exec app pnpm db:transfer --from postgres --to sqlite --clean
```
Each table's primary keys and row data are checked across both engines. Any row count or SHA-256 mismatch aborts the migration immediately.

#### 5. Bootstrap Emergency Administrator
Securely inject an admin account via stdin pipe without leaving passwords in command history or environment logs:
```bash
echo "SecureAdminP@ssw0rd!" | docker compose exec -T app pnpm admin:bootstrap admin@ijuru.rw
```

---

## 6. Split Deployment: Vercel + ThalesOps

For teams choosing Vercel for UI hosting and ThalesOps for data persistence:

1. **Deploy Backend on ThalesOps**:
   - Host `ijuru-signal` on ThalesOps with domain `api.ijuru.rw`.
   - Set up volume mount `/app/data` for SQLite.
2. **Deploy Frontend on Vercel**:
   - Import the repository into Vercel.
   - Configure `NEXT_PUBLIC_API_URL=https://api.ijuru.rw` in Vercel project settings.
   - Or configure Next.js rewrites in `next.config.ts`:
     ```typescript
     import type { NextConfig } from "next";

     const nextConfig: NextConfig = {
       async rewrites() {
         return [
           {
             source: "/api/:path*",
             destination: `${process.env.BACKEND_INTERNAL_URL || "https://api.ijuru.rw"}/api/:path*`,
           },
         ];
       },
     };

     export default nextConfig;
     ```

---

## 7. Operational Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| Healthcheck fails (`500` / timeout) | App not listening or DB uninitialized | Check `docker compose logs app`. Verify `/app/data` directory permissions. |
| SQLite database locked | Concurrent writes without WAL mode | WAL mode is activated by `server/db/sqlite.ts` automatically (`journal_mode = WAL`). Ensure filesystem supports POSIX locks. |
| AI responses falling back to Offline mode | Missing or invalid AI credentials | Verify `OPENROUTER_API_KEY` or `AI_API_KEY`. Check `curl http://localhost:3000/api/health` for `"aiConfigured": true`. |
| PostgreSQL connection refused | Container not ready or network mismatch | Ensure postgres container is healthy: `docker compose ps`. Verify `DATABASE_URL` references host `postgres` inside Docker network. |
