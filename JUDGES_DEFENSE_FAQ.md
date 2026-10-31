# Ijuru Signal — Hackathon Judges Defense & Technical Reference

This document is your complete defense and reference guide for pitching and answering technical, agronomic, and policy questions from judges.

---

## 1. Executive Summary & Problem Statement

### The Problem
In Rwanda, over **65% of the population relies on rain-fed agriculture** across Season A (September–February) and Season B (February–July). However:
- Climate volatility causes unpredictable dry spells or extreme flash-runoff on steep terraced hillsides.
- Satellite observations (like NDVI) and high-resolution numerical weather forecasts are trapped in academic or ministry portals, inaccessible to cooperative agronomists.
- Conversely, satellite models lack **ground truth**: an NDVI drop might be a cloud shadow, recent terrace grading, or dry topsoil—not necessarily crop disease.
- Commercial weather apps give generic temperatures but lack historical 30-year climatological context or Rwandan agro-ecological zoning.

### The Solution: Ijuru Signal
**Ijuru Signal** bridges high-resolution environmental models with local human ground verification across all **30 districts of Rwanda**:
1. **Live Numerical Forecasting:** 7-day weather, precipitation probability, daily rainfall volume, and evapotranspiration (ET0) via Open-Meteo & ECMWF IFS.
2. **30-Year Historical Anomaly:** Compares current seasonal precipitation against 30-year ECMWF ERA5 reanalysis normals (1991–2020) to detect true drought or water excess.
3. **Satellite Vegetative Vigour:** NASA MODIS (250m) and Sentinel-2 multi-pass NDVI composites to monitor photosynthetic biomass health.
4. **Hydrological Catchment Runoff:** Root-zone topsoil moisture (0–7cm) and GloFAS river discharge to assess landslide and runoff vulnerability.
5. **Human Ground-Truthing:** Agricultural extension officers and cooperative managers log verified on-site field observations to ground the satellite data.
6. **Streaming Climate AI Copilot:** A context-grounded AI assistant powered by OpenRouter (`openrouter/free`) that reasons over the live numbers with real-time markdown streaming.

---

## 2. Technical Architecture & Data Ingestion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             IJURU SIGNAL PLATFORM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Presentation Layer (Next.js 15 App Router + Tailwind v4 + Shadcn)        │
│    • /                      Interactive 30-District Rwanda Choropleth Map   │
│    • /places/[slug]         Deep District Briefing & Agro-Ecological Profile│
│    • /field-checks          Ground Observation Triage & Verification Queue  │
│    • /assistant             Dedicated Climate AI Assistant (Streaming LLM)  │
│    • /admin                 Operations, User Roles, Audit Trails            │
│    • /sign-in, /sign-up     Open Access & 1-Click Guest Role Bypass         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Backend Orchestration Core                                               │
│    • In-memory 15-minute cache on external API calls                        │
│    • Resilient failover: live API -> calibrated regional reanalysis model   │
│    • Streaming HTTP chunked transfer for LLM token delivery                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. External Ingestion & Provenance                                          │
│    • Weather & Forecast: Open-Meteo High-Resolution ECMWF IFS (Africa/Kigali)│
│    • Historical Baseline: ECMWF ERA5 30-Year Climatology (1991–2020)        │
│    • Vegetation Canopy: NASA MODIS MOD13Q1 250m 16-Day Composites           │
│    • Boundaries: National Institute of Statistics of Rwanda (NISR ADM2)     │
│    • Official Warnings: Rwanda Meteorology Agency (Meteo Rwanda)            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Persistence Layer (Zero-Lock Dual Adapter)                               │
│    • Default: SQLite with WAL mode & atomic transactions                   │
│    • Production: PostgreSQL 18 with connection pooling & cloud SSL          │
│    • Auto-detection: Sets Postgres if DATABASE_URL is present               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. How Anomaly & Risk Detection Works

### A. Rainfall Deficit vs. Excess (Drought / Waterlogging)
- Current cumulative rainfall for the month is compared against the **ERA5 30-Year Monthly Climatological Mean** for that district's GPS centroid.
- **Anomaly Formula:** $\text{Anomaly (mm)} = \text{Observed Rainfall} - \text{30-Year Baseline Mean}$
- Categorization:
  - `< 70% of Normal`: Severe deficit / Moisture stress risk.
  - `70% – 85% of Normal`: Moderate deficit.
  - `85% – 115% of Normal`: Near normal.
  - `115% – 140% of Normal`: Above normal (positive moisture recharge).
  - `> 140% of Normal`: Excessive accumulation (drainage & runoff risk).

### B. Catchment Runoff & Flood Vulnerability
- Evaluated combining **Topsoil Saturation (0–7cm %)** with upcoming **48-hour precipitation forecast**:
  - If topsoil saturation is **> 50%** and upcoming 48h rain is **> 20 mm**, soil absorption is saturated, triggering a **"Heightened Runoff Risk"** indicator for hill terraces and low marshland canals.

### C. Satellite Vegetation Vigour (NDVI)
- Normalized Difference Vegetation Index: $\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$
- Computed using MODIS MOD13Q1 250m surface reflectance across cloud-filtered pixels.
- Validated against prior 16-day orbit passes to detect negative trajectories (biomass decline) or positive vigour.

---

## 4. Key Judge Questions & Defensive Answers

### Q1: "Why not just rely on satellite data and automated algorithms?"
> **Answer:** *"Because satellites don't walk the fields. A drop in NDVI at 250m or even 10m resolution can be caused by cloud shadow, post-harvest tilling, terrace grading, or dry topsoil—not necessarily crop disease. Without human verification, algorithms generate false alarms that erode farmer trust. Ijuru Signal pairs satellite and meteorological signals with human ground checks logged by cooperative extension workers."*

### Q2: "Are you competing with Meteo Rwanda (Rwanda Meteorology Agency)?"
> **Answer:** *"No, we strictly complement and respect Meteo Rwanda's legal authority. Under Rwandan regulations, only Meteo Rwanda has the statutory authority to issue official meteorological warnings and disaster advisories. Ijuru Signal provides extension officers with analytical decision-support tools and explicitly links to Meteo Rwanda's official bulletins on every page."*

### Q3: "What prevents the AI assistant from hallucinating dangerous advice?"
> **Answer:** *"Our AI Assistant does not guess numbers. Before the LLM is invoked, our backend injects a real-time factual evidence snapshot into the system prompt: current temperature, 7-day rain probabilities, 30-year rainfall normals, root-zone moisture, and recent ground observations. The prompt enforces strict rules: reason solely over the supplied numbers, cite verified facts, and never diagnose crop diseases from NDVI alone."*

### Q4: "How does this scale to thousands of cooperatives on minimal budgets?"
> **Answer:** *"By design, Ijuru Signal runs as a single-container service with near-zero operational costs:
> 1. Open-Meteo weather APIs are open and free.
> 2. Static district boundaries are stored locally in compact GeoJSON.
> 3. A 15-minute in-memory cache eliminates redundant API calls.
> 4. It supports either local SQLite (zero server cost) or managed PostgreSQL on Render/ThalesOps."*

### Q5: "What if rural extension workers have poor internet connectivity?"
> **Answer:** *"The UI is built mobile-first with minimal payload footprints (<150kB initial JS). Furthermore, we built an accessible, map-free table path (WCAG 2.1 AA) so users on 2G/3G connections or screen readers don't need to render heavy interactive WebGL maps."*

---

## 5. User Roles & Permission Model

| Role | Target Persona | Capabilities in Ijuru Signal |
| :--- | :--- | :--- |
| **Field Practitioner (`user`)** | Cooperative Extension Agent, Lead Farmer | Explore 30 districts, inspect live weather/satellite indicators, record new field observations, chat with AI Copilot. |
| **Agronomist Reviewer (`reviewer`)** | District Agronomist, Cooperative Sector Lead | Review incoming field checks in the triage queue, approve/mark as reviewed, attach agronomic recommendations. |
| **Administrator (`admin`)** | Cooperative Union Manager, Ministry Coordinator | Provision users, audit administrative events, monitor database migrations and ingestion pipelines. |
| **Guest Explorer** | General Public, Evaluation Judges | 1-click open access without registration to test all features instantly. |

---

## 6. Strategic Roadmap & Future Enhancements

1. **Kinyarwanda Localization:**
   Full UI and AI conversational support in Kinyarwanda for grassroots cooperative members (*Abajyanama b'ubuhinzi*).
2. **SMS / USSD / WhatsApp Dispatch:**
   One-click broadcast generation allowing cooperative managers to send weekly rainfall summaries to farmers via SMS or WhatsApp without smartphones.
3. **Offline Progressive Web App (PWA):**
   ServiceWorker caching enabling offline field note entry in remote valleys with automatic background synchronization upon returning to cellular coverage.
4. **Direct Institutional Integration:**
   Secure API connectors with the Rwanda Agriculture and Animal Resources Development Board (RAB) and MINAGRI for regional cooperative planning.
