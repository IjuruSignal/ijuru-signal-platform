# Working instructions

This repository stands alone; no workspace or shared cross-project package. Read MEMORY.md, PRODUCT.md, DESIGN.md and docs before changing behavior. User instructions outrank this file. Do not present example observations as live data, a vegetation index as a diagnosis, or a forecast as an official warning. Attribute sources, retain observation dates, scale, coverage and processing versions; missing or stale data must be visible.

Keep an accessible map-free route and a mobile-first evidence-to-field-check workflow. Human verification and Meteo Rwanda warnings remain explicit. Avoid scoring or alerts until thresholds and performance are validated with local experts. Do not put sensitive locations or identifiers in public exports or logs. Follow provider terms and document licenses and provenance.

Use local shadcn-style components and the project's own design language. Test keyboard, touch, responsive, empty, loading, stale and error states. Run applicable checks and disclose limitations. Keep MEMORY.md factual and update it when decisions actually change; never commit secrets.

## Implementation handoff

Read `docs/09-implementation-architecture.md`, `TASKS.md` and `AGENT_PROMPT.md` before implementation. SQLite is default; Postgres 18 is an optional verified adapter, not a replacement of the local default. Implement only OpenAI-compatible and Anthropic external providers; disabled/fake modes are for safety and testing. One bounded orchestration core per repository, with feature-specific workflows; no monorepo, cross-repository imports or duplicate provider clients. Keep TASKS.md checkboxes and MEMORY.md current after each verified milestone, including commands, evidence, bugs and known limitations. Mark work complete only when verified. Prototype `index.html` is the main user experience and `dashboard.html` is the separate administrator reference. Do not open Chrome; user will launch previews.
