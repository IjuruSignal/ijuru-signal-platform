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
- [ ] Implement authentication, roles, area-scoped access, audit logging and private storage; reject insecure production configuration. Partial: SQLite password/session primitives exist but are not exposed; offline first-admin bootstrap exists; secure HTTP session handling, further account provisioning, rate limits and private storage remain.

## Vertical slice
- [ ] Implement area selection and persistence with boundary provenance; show unavailable data, not fabricated risk, for all actual areas until sources are configured. Partial: SQLite area selection and versioned boundary records exist; evidence records now reference a boundary version; app integration, topology validation and verified boundaries remain.
- [ ] Implement field observation CRUD, ownership/role checks, review states and admin queue; test safe handling and conflicts. Partial: SQLite repository CRUD and review checks exist; authenticated routes and the admin queue are not connected.
- [ ] Build weather/source adapters with timeout, attribution, timestamps, cache and stale/error states; link official Meteo Rwanda warnings without claiming integration.
- [ ] Build reproducible Sentinel-2 and CHIRPS ingest with explicit scope, quality/coverage and version metadata; use labelled fixtures if credentials, rights or input datasets are absent. Partial: a SQLite evidence record contract and fixture-only NDVI/monthly rainfall calculations exist; no real ingest or source rights are established.
- [ ] Implement one orchestrator, both provider adapters and test fake; build evidence-grounded summary with validated numbers, dates, citations and abstention. Core evidence remains usable with AI disabled.
- [ ] Implement durable jobs, retry/lease recovery and source-run admin; test duplicate execution and stale data.

## Quality and readiness
- [ ] Verify SQLite/PostgreSQL parity, provider adapter contract tests, data quality, worker races, map-free accessibility, responsive behavior and role isolation.
- [ ] Document data lineage, backups, cost limits, incident response, provider licensing and actual source setup.
- [ ] Retrospectively validate any candidate decision rule with independent local experts before enabling scoring or warnings; report sample size, missing data, errors and uncertainty.
