# Project memory

Updated 27 October 2026. User-selected name: Ijuru Signal. Separate Git repository and Next.js project; do not turn it into a workspace. Initial user is a district/cooperative practitioner; district and partner are unconfirmed. MVP links weather forecasts, cloud-filtered satellite observations and historical rainfall to a field-check record. Landing page and prototype use fictional data only. No live providers, analytics, database or field verification are implemented. UI references: DESIGN.md and prototype/index.html. Standalone prototypes were syntax-checked but have not been visually reviewed in a browser. Source access, thresholds, expert review, rights, costs, pilot design, trademark/domain clearance and operating partner remain open. Official warnings remain with Meteo Rwanda.

Dashboard concept: `prototype/dashboard.html` is a standalone illustrative HTML mockup. It has not been visually reviewed and does not connect to live services or persist data.

Prototype routing: `prototype/index.html` is the main user experience; `prototype/dashboard.html` is the separate admin concept. Both are illustrative and do not save data.

## Architecture preparation — 27 October 2026

Requested design: Next.js feature-first location evidence and field verification, SQLite by default, optional PostgreSQL 18, one bounded orchestrator with OpenAI-compatible and Anthropic adapters. See `docs/09-implementation-architecture.md`, `TASKS.md` and `AGENT_PROMPT.md`. `.env.example`, `.env.postgres.example` and `compose.postgres.yml` are configuration templates only. No SQLite/PostgreSQL adapter, migration, agent layer or integration has been implemented in this phase. Docker image inspection returned permission denied on the Docker socket; the image and Compose startup were not verified. No provider API call, real data migration or deployment was performed. Existing `node_modules`, `.next` and lockfiles were already present at inspection; current builds were not rerun.

Known issues/open decisions: source rights, consent and reviewer staffing remain unresolved; prototypes are not production applications; DB and provider parity are untested; local Node/driver compatibility, credentials, costs and deployment environment require validation. See task checklist for remaining work.

## Implementation progress — 27 October 2026

Replaced the landing concept with a map-free district selection and source briefing, using feature-owned client UI. Forecast, satellite, rainfall and hazard assessment are explicitly unavailable; names are navigation only and boundaries are not configured. Official guidance links to Meteo Rwanda. `/admin` exposes no data or operations while authentication is absent. District selection is in-memory only; no location, notes or user data are persisted. No real source is connected.

Added explicit SQLite migration and backup CLI using `node:sqlite` (verified on Node 26.12.0; not compatible with Node 20), with foreign keys, WAL and busy timeout, initial area/user/access/field-check/audit schema and `VACUUM INTO` backup. The application does not yet use this database. `pnpm test` passed one SQLite schema test covering repeat migration, WAL, foreign keys and role constraint. A temporary database was migrated, backed up and the backup reopened/migrated successfully. `pnpm build` compiled and generated routes successfully; and exited successfully. Impeccable detector returned `[]`. No browser or visual responsive/keyboard testing was performed, as Chrome was explicitly excluded.

Remaining: actual authentication and area authorization, private storage, field-check use cases, repository and concurrency contracts, Postgres migration and parity, durable jobs, provider integrations, AI safety orchestration, source rights, expert validation, and end-to-end accessibility and responsive testing. The task checkboxes remain open because their acceptance criteria are broader than this partial implementation.

Additional partial foundation: SQLite field-check repository supports creation, authorized read and reviewer transition with atomic success audit and optimistic version conflict; it is not exposed over HTTP and depends on a future trusted identity layer. A second migration and SQLite queue functions implement idempotent enqueue, lease recovery, bounded attempts and fenced completion; no worker, cancellation, retry scheduling or transactional outbox exists yet. `pnpm test` passed three test cases covering schema, area/owner/reviewer isolation and conflicts, plus duplicate jobs and expired-lease fencing. No PostgreSQL, authenticated end-to-end path or AI transport is implemented. Do not treat these partial functions as production-ready.

A standalone, unconnected brief validator rejects missing/unknown citations, expired/unreviewed evidence and numeric tokens absent from cited records; accepted text is still `needs_review`. It does not establish semantic entailment or implement an orchestrator and must not be used to publish autonomous summaries. `pnpm test` passed the SQLite and validator test files after these additions.

### Brief validation hardening — 27 October 2026

The standalone, unconnected brief validator now suppresses the entire output if any statement fails validation, rejects duplicate evidence identifiers and invalid validation times, and compares signed and decimal numeric tokens without dropping signs or decimal parts. `pnpm test` passed all three test files, including new cases for mixed valid/invalid statements, changed signs and precision, duplicate IDs and invalid dates. This token check still cannot establish semantic entailment, numeric units, provenance or a safe hazard interpretation; accepted output remains `needs_review` and is not connected to the app. The provider/orchestrator files are partial prototypes: host DNS/IP enforcement, bounded retries, durable runs, tool authorization and full provider contracts remain unimplemented. No checklist item was marked complete because its acceptance criteria have not been met.

### SQLite job lifecycle — 27 October 2026

Added migration 003 for retry availability and controlled failure codes. The SQLite queue now rejects conflicting idempotency-key reuse, validates canonical UTC timestamps and bounded payloads, schedules bounded retries, cancels queued or leased jobs, and fences late completion/failure. Added a single-job worker function with an explicit handler registry, timeout/abort signal and controlled error codes. `pnpm test` passed four test files on Node 26.12.0, covering delayed retries, exhausted attempts, cancellation, stale leases, two SQLite connections, worker timeout and idempotency conflicts. An initial test failed because its fixed claim time preceded the job's actual creation; the test now supplies a consistent clock and passes.

This is still a partial milestone: the worker is not started by a process, handlers and source-run admin are not connected, cancellation does not undo an external effect, and idempotent handlers are required. No transactional outbox, real concurrent multi-process race test or PostgreSQL implementation is present. No task checkbox was marked complete.

`pnpm build` also completed successfully after the queue changes; the generated app still contains only `/` and the placeholder `/admin` routes.

### Authentication and field-check repository — 27 October 2026

Migration 004 adds SQLite credentials and sessions. The unconnected authentication repository uses salted scrypt password hashes, hashed random session tokens, expiry, revocation on password change, per-account lockout, and an in-transaction credential recheck after hashing. Successful session creation is audited without credentials or tokens. `pnpm test` passed five test files, including lockout, expiration, logout, password change and token hashing on Node 26.12.0. This is not a complete authentication system: it has no provisioning interface, HTTP routes, cookie settings, CSRF/origin protection, IP rate limits, session management UI or production configuration validation. Synchronous password hashing and account lockout need operational review before exposure; lockout can be abused for denial of service. No authentication endpoint was enabled.

The SQLite field-check repository now lists area-authorized records, allows authors to update or delete their own pending observations using version checks, and audits successful modifications. Reviewed records cannot be edited or deleted through these functions. Tests cover author isolation, reviewer access, stale versions and reviewed-state restrictions. These are repository functions only; identity, HTTP routes, review queue UI, deletion/retention policy and production authorization are not complete. Task items remain open.

### Offline administrator bootstrap — 27 October 2026

Added an atomic SQLite first-admin bootstrap function and `pnpm admin:bootstrap LOGIN`. The command requires an already migrated database and reads the passphrase from a non-terminal stdin pipe, rather than arguments or environment variables. It refuses to create another administrator when one exists and records a bootstrap audit event. README documents the workflow and its limitations. `pnpm test` outside the sandbox passed 14 tests, including the actual command with piped input, duplicate bootstrap rejection and verification that output does not contain the passphrase. The first sandboxed command test failed because sandbox restrictions interfered with child-process stdin; the same suite passed outside the sandbox. No web login, account recovery, additional user provisioning, or admin UI is available. The authentication checklist remains open.

### Evidence provenance foundation — 27 October 2026

Added SQLite migration 005 and an unconnected evidence repository. Its structured records require a source name, ID, URL, version and license; observation and expiry timestamps; scope and coverage fraction; quality, processing version, scale and an explicit fixture flag. Evidence IDs are immutable and duplicate imports with differing content fail. The query distinguishes missing, future and stale records while retaining source information. `pnpm test` outside the sandbox passed all 16 tests, including provenance validation, foreign-key isolation, idempotent import and unavailable/stale states. The sandboxed full suite again failed at the known child-process stdin test; the evidence tests themselves passed there.

This is a storage contract, not a source integration, ingest pipeline, independently verified license, human-reviewed dataset or public UI. No actual evidence or fixture was inserted into an application database. A trusted future ingest must verify source rights and accuracy; the current schema cannot prove those claims. Area authorization, retention, numerical units and coverage sufficiency policies are not yet connected. The Sentinel-2/CHIRPS and weather tasks remain open.

### Area persistence and boundaries — 27 October 2026

Migration 006 adds immutable versioned boundary records and per-user area preferences. The unconnected SQLite repository permits administrator area creation and boundary registration with audit events, and persists selections only for authorized users; revoking an area grant makes an earlier selection inaccessible. Boundary records require a source, URL, license, acquisition date, version and explicit fixture status. Structural checks bound coordinate counts and validate polygon shape, closure and coordinate ranges. `pnpm test` outside the sandbox passed 18 tests, including role isolation, grant revocation, malformed geometry, immutable versions and audit behavior.

No real boundary was imported, reviewed or approved. Structural validation does not detect self-intersection or establish topology, license rights or accuracy. The UI still uses in-memory district names; there is no authenticated route, grant-management workflow, boundary selection, or linkage from evidence to the relevant boundary version. The area task remains open.

### Evidence boundary linkage — 27 October 2026

Migration 007 links evidence to an immutable area boundary version using composite foreign keys. New records require a boundary version, are inserted with the reference in one transaction, and cannot claim a non-fixture observation using an illustrative boundary. Read results include boundary provenance. Existing evidence rows without a reference remain intact but return `provenance_missing` with no record for use; no boundary is inferred for them. `pnpm test` outside the sandbox passed 19 tests, including missing-boundary rollback, fixture mismatch and legacy-record handling. This association is not yet used by the UI or real ingest, and it does not prove the boundary or observation is geographically correct. Source and area tasks remain open.

### Illustrative observation calculations — 27 October 2026

Added fixture-only, deterministic sample calculations for vegetation index and monthly rainfall context. Vegetation samples require an explicit fixture flag and already clipped, equally weighted reflectance; only SCL vegetation class 4 with valid nonzero denominator contributes, and an empty valid set returns null. Rainfall compares a complete target month with the matching calendar month in explicitly named baseline years; missing or incomplete inputs return unavailable instead of zero. Outputs carry algorithm versions, units and fixture labels. `pnpm test` outside the sandbox passed 21 tests, including masking, zero denominator, baseline matching, missing months and incomplete coverage.

These are not Sentinel-2/CHIRPS adapters or validated production algorithms. They neither fetch data nor perform geometric intersections, determine actual cloud-mask quality, verify rights or establish source suitability. The assumption of equally weighted pixels is unsuitable without verifying the actual grid and area weighting; local scientific review is needed. The results are not stored, displayed or used as hazard diagnoses. The ingestion task remains open.

### Prototype porting and validated configuration — 31 October 2026

Ported both mobile-friendly user and admin prototypes into feature-based Next.js App Router components:
- `features/locations/components/location-workspace.tsx` mounted at `/`: supports both the illustrative demo location and real districts with explicit "Data unavailable" state, official Meteo Rwanda guidance, hazard exploration categories, source quality cards, and an interactive field note preview form.
- `features/admin/components/admin-workspace.tsx` mounted at `/admin`: ports `prototype/dashboard.html` with operations stats (pending checks, pipeline issues, configured areas), an interactive client-filterable field check queue (`all`, `pending`, `complete`), pipeline ingestion statuses, official guidance links, and explicit illustrative mock notices.
- Refactored `app/globals.css` with accessible focus indicators, 44px min touch targets, mobile responsiveness, and zero compiler/autoprefixer warnings.

Implemented server-side validated configuration in `server/config/index.mjs` (`loadConfig`):
- Defaults to local durable SQLite (`./data/app.sqlite`); strictly rejects `:memory:` in-memory databases and empty paths.
- Validates Postgres `DATABASE_URL` schemes (`postgres:`/`postgresql:`).
- Safe-by-default AI configuration: defaults to `disabled`; strictly validates `openai-compatible` and `anthropic` providers, enforcing HTTPS protocols in production, query/credential sanitization, and strict host allowlisting (`AI_ALLOWED_HOSTS`) against SSRF.
- Validates bounds for session TTL, lockout threshold, lockout duration, timeouts and output tokens.
- Integrated `loadConfig()` across CLI scripts (`scripts/db-migrate.mjs`, `scripts/db-backup.mjs`, `scripts/bootstrap-admin.mjs`).
- Added `tests/config.test.mjs` with 9 tests. All 31 tests passed via `pnpm test` on Node 26.12.0. `pnpm build` verified static compilation for `/` and `/admin` routes.
- Known limitations: `/admin` and note forms remain client previews until authenticated HTTP session middleware, private note storage, and API routes are connected. PostgreSQL adapter and parity tests remain open.

### PostgreSQL 18 adapter and parity verification — 31 October 2026

Implemented the full PostgreSQL 18 adapter, equivalent migrations, and parity verification:
- Created 8 equivalent PostgreSQL migrations in `server/db/migrations/postgres/` matching SQLite migrations 001 through 008.
- Implemented `server/db/postgres.mjs` providing `createPool`, `withTransaction` supporting re-entrant clients, and transactional `migrate(pool)`. Verified migration idempotency against PostgreSQL 18 on loopback port 55431.
- Implemented PostgreSQL feature repository adapters mirroring the SQLite contracts:
  - `server/auth/postgres.mjs`: salted scrypt hashing, timing-safe checks, token digests, lockout, admin bootstrap, user provisioning, and audit trails.
  - `server/jobs/postgres.mjs`: transactional job claiming with `SELECT ... FOR UPDATE SKIP LOCKED` and lease fencing.
  - `features/locations/repositories/postgres.mjs`: area creation, versioned GeoJSON boundary persistence, and area preference isolation.
  - `features/field-checks/repositories/postgres.mjs`: field check CRUD, author isolation, optimistic version conflict checks, and reviewer approval transitions.
  - `features/evidence/repositories/postgres.mjs`: boundary-linked evidence records and multi-source brief evaluation.
- Implemented offline bidirectional data transfer utility in `scripts/db-transfer.mjs` with topological table ordering, row count reconciliation, and SHA-256 table checksum verification.
- Added `tests/parity.test.mjs` verifying identical behavior across both SQLite and PostgreSQL 18:
  - Role enumerations and foreign key constraints.
  - Optimistic locking and stale review conflicts on field checks.
  - Idempotent job deduplication, dual-worker claim exclusion, and lease expiration recovery fencing.
  - Bidirectional data transfer and roundtrip checksum parity.
- `pnpm test` passed all 38 tests on Node 26.12.0. `pnpm build` verified clean Next.js compilation.
- Updated `compose.postgres.yml` and `.env.postgres.example` default port to 55431 to avoid host port collisions.


