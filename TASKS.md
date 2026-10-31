# Implementation checklist

Update this file when each item is implemented and verified. Mark `[x]` only when acceptance evidence and commands are recorded in MEMORY.md; otherwise leave `[ ]` and record the blocker. No implicit completion from scaffolding.

## Preparation
- [x] Independent project, requested user/admin HTML prototypes and planning documents exist (prototype only; no production backend).
- [x] SQLite-first architecture, PostgreSQL 18 Compose/env examples, typed orchestration design and agent starting prompt documented; not yet tested or implemented.
- [ ] Confirm pilot area, source rights, expert thresholds, reviewer staffing and privacy policy with local stakeholders; use labelled fixtures until resolved.

## Foundation
- [x] Validate Node/dependencies and current build; establish feature-based Next.js structure and port both mobile-friendly user/admin prototypes.
- [x] Implement validated config, SQLite default, versioned migrations and SQLite backup; preserve durable local storage and Node runtime.
- [x] Implement PostgreSQL adapter and equivalent migrations; run repository and concurrency parity tests using SQLite and PostgreSQL 18. Provide explicit offline transfer, reconciliation and rollback.
- [x] Complete TypeScript migration: convert 100% of codebase (server, domain, repositories, scripts, tests) from JavaScript (.mjs) to TypeScript (.ts), remove all .mjs files, and verify with Node 26 type stripping.
- [x] Implement simplified authentication, session cookie management, demo role switcher (admin, reviewer, user), and audit logging.

## Vertical slice
- [x] Implement area selection and persistence with boundary provenance; GeoJSON boundary version resolution and metadata display for Kigali, Bugesera, Musanze, Rubavu, and Nyagatare.
- [x] Implement field observation workflow, real authenticated submission, optimistic version locking, reviewer approval transitions (pending -> reviewed), conflict detection, and audit logging.
- [x] Build weather and Meteo Rwanda adapters with Open-Meteo live HTTPS ingest, 5-day forecast cards, 15-minute caching layer, and official Meteo Rwanda bulletin advisory links without unapproved diagnostic claims.
- [x] Build Sentinel-2 NDVI fixture aggregation and CHIRPS historical rainfall anomaly baseline comparison with explicit attribution and non-diagnosis disclosures.
- [x] Implement bounded AI Climate Copilot chat (/api/ai/chat & <CopilotChat />) with prompt pills, grounded climate synthesis, and verifiable citations for extension workers and agronomists.
- [x] Connect AdminWorkspace at /admin to live triage queue with interactive approval controls and real-time pipeline monitoring.

## Quality and readiness
- [x] Verify SQLite/PostgreSQL parity, provider adapter contract tests, data quality, worker races, map-free accessibility, responsive behavior and role isolation (38/38 passing tests).
- [x] Verify production build (pnpm build generating all 11 static and dynamic routes with zero TypeScript or webpack errors).
- [x] Document data lineage, backups, cost limits, incident response, provider licensing and actual source setup (documented in docs/10-lineage-and-ops.md and MEMORY.md).
- [ ] Retrospectively validate any candidate decision rule with independent local experts before enabling scoring or warnings; report sample size, missing data, errors and uncertainty.
