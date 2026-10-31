> **Superseded infrastructure details:** [Implementation architecture](09-implementation-architecture.md) is authoritative for SQLite-first storage, PostgreSQL 18 substitution, agents, jobs and feature layout. Retain this document for product workflow context; references below to PostgreSQL-first, PostGIS or S3 as required infrastructure are historical and not current decisions.

# Architecture and integration plan

## Stack


This app: Next.js App Router + TypeScript, server-side route handlers, PostgreSQL with PostGIS for geographic data, optional object storage for source artifacts, and source-owned shadcn-style components. A separately deployed TypeScript worker uses a Postgres job table with leases, retry/backoff, idempotency keys and dead-letter status for ingestion and long-running AI work. Use a dedicated database and separate permissions. Deploy the web app and worker on a Node-compatible host; managed Postgres, object storage, domain, backups and secrets are operational choices still to be made. Provisioning is not implemented.

Entities: `users`, `areas`, `sources`, `observations`, `forecast_runs`, `field_checks`, `jobs`, and `audit_events`. Each observation stores provider, source URL, acquired time, valid period, geometry/scale, processing version, units and quality flags. Use migrations and constraints; encrypt transport and storage; use private buckets and short-lived URLs; validate any uploads server-side and limit rates. Define retention, deletion, access roles and incident response with a privacy expert before real data collection.

## Ijuru Signal acquisition and analysis

1. With permission, obtain a representative district/area boundary and store its provenance. Use district scale first; do not imply 10 m pixels resolve individual small plots.
2. Register with Copernicus Data Space and create OAuth client credentials. A scheduled TypeScript job queries its [Catalog API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/ApiReference.html), then requests Sentinel-2 L2A B04/B08 and scene classification through the [Process API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/UserGuides/BeginnersGuide.html). Mask clouds, shadow, no-data and non-vegetation as appropriate; calculate NDVI = (B08 − B04)/(B08 + B04), excluding zero denominators. Aggregate only valid pixels by area and acquisition window; save valid-pixel fraction, acquisition dates, units and algorithm version. Review masks and thresholds with a remote-sensing specialist.
3. Ingest CHIRPS historical rainfall files with a reproducible import script, geographic intersection and monthly aggregation. Compare a complete period with the same period in an explicitly defined multi-year baseline; record baseline years, coverage and uncertainty. Do not call historical rainfall an official real-time alert.
4. Server fetches Open-Meteo for a representative point and records coordinates, model attribution, fetched time, forecast valid times and cache TTL. Treat it as a model estimate; link Meteo Rwanda for authoritative local warnings. Validate terms and forecast suitability for Rwanda before a pilot.
5. Present separated observations and forecast. A deterministic rules layer may flag a *candidate for review* only after an expert agrees thresholds and a retrospective validation exists. An LLM can summarize supplied structured facts with citations but must not create numbers, convert a signal into a hazard diagnosis or override official warnings. Provide a map-free list and field-check record.

## Operations and release gates

Use staging and production credentials separately, secrets in the host's secret store, least privilege, database migrations, tested backups, monitoring for stale data and failed jobs, and provider cost limits. Obtain explicit data reuse rights and participant consent; establish roles and human-review capacity. Pilot with representative users and held-out expert assessments; publish limitations and aggregate results. This repository currently contains UI and plans only—not these integrations, safeguards or a production service.
