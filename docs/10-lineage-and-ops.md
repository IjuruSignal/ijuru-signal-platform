# Data Lineage, Backups, Operations and Incident Response

## 1. Data Lineage & Provenance

Every observation, boundary, and forecast ingested by Ijuru Signal retains explicit provenance, acquisition timestamps, license attribution, and validation metadata:

| Source | Provider | License | Spatial / Temporal Scale | Lineage & Ingest Mechanism |
|---|---|---|---|---|
| **Weather & Forecasts** | Meteo Rwanda & Open-Meteo | CC-BY 4.0 / WMO Public | District centroid coordinates, hourly / 5-day daily forecast | HTTPS fetch with 15-minute deterministic caching layer. Falls back to calibrated regional climatology on upstream network failure. |
| **Vegetation Health (NDVI)** | Copernicus Sentinel-2 MSI L2A | Copernicus Open Access Policy | 10-meter surface reflectance, 5-day revisit pass | SCL (Scene Classification Layer) cloud/shadow mask filtering (vegetation class 4). Zero-denominator and empty valid set safety. |
| **Historical Rainfall Anomaly** | CHIRPS v2.0 (UCSB Climate Hazards Center) | Open Access / Public Domain | 0.05° grid, 30-year monthly baselines (1981–2025) | Monthly baseline comparison matching calendar months. Requires complete months; partial months produce explicit abstention. |
| **District Boundaries** | National Institute of Statistics of Rwanda (NISR) | CC-BY 4.0 (Government of Rwanda) | Level-2 Administrative Boundaries (Districts) | Immutable versioned GeoJSON polygons with SHA-256 provenance hashes and topological validation. |
| **Field Observations** | Agricultural Extension Workers & Local Agronomists | Private / Internal Cooperative Grant | Geolocation / Sector note, timestamp, observer ID | Authenticated user submission into SQLite/PostgreSQL with optimistic locking and reviewer approval transition. |

## 2. Backup & Disaster Recovery Procedures

### SQLite Default
- **Atomic Backup Command**: `pnpm db:backup <destination-path>`
  - Uses SQLite `VACUUM INTO ?` for a non-blocking, transactionally consistent snapshot.
  - Automatically permissions the snapshot to `0o600` (read/write by owner only).
- **Verification Drill**: Restore backup into a test directory and execute `pnpm test` to verify zero data loss.

### PostgreSQL 18
- **Snapshot Backup**: `pg_dump -Fc -d $DATABASE_URL > backup_$(date +%s).dump`
- **Restore**: `pg_restore --clean --if-exists -d $DATABASE_URL backup.dump`
- **Offline Data Transfer**: `pnpm db:transfer --from sqlite --to postgres --clean`
  - Verifies round-trip table checksums (SHA-256) and row count parity across all 13 schema tables.

## 3. Cost Limits & Spend Controls

1. **Weather Ingest**: Rate-limited and cached with a 15-minute TTL per district, bounding external HTTP calls to at most 4 requests/hour per active district.
2. **AI Provider Spend Caps**:
   - AI calls default to `disabled` for zero unintended spend.
   - When enabled, `server/config/index.ts` strictly enforces:
     - Output token bounds (`maxOutputTokens: 2000`).
     - Network timeout (`timeoutMs: 30000`).
     - Host allowlisting (`AI_ALLOWED_HOSTS`) preventing SSRF and arbitrary remote billing.

## 4. Incident Response Runbook

### Scenario A: Upstream Weather API Failure
- **Symptom**: External Open-Meteo endpoint returns 5xx or times out.
- **Handling**: `fetchDistrictWeather` catches network aborts/errors and returns calibrated regional climatological defaults labeled with `status: 'calibrated_model'`. The UI explicitly displays the fallback notice.

### Scenario B: Cloud Obscuration Over Satellite Pass
- **Symptom**: Sentinel-2 pass over Rwandan volcanic or hilly sectors has high cloud coverage (>20%).
- **Handling**: SCL cloud filtering strips invalid pixels. If valid vegetation pixels are insufficient, `aggregateVegetationFixture` returns `null`, and the UI displays an explicit `Cloud obscured — ground check required` badge rather than a misleading zero NDVI.

### Scenario C: Concurrent Field Check Review Conflict
- **Symptom**: Two agronomists review the same field check concurrently.
- **Handling**: Optimistic version locking rejects the second review with `409 Conflict` (`WHERE id = ? AND version = ? AND status = 'pending'`). Audit logging records the transaction.
