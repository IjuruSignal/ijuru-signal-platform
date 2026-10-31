"use client";

import { useState } from "react";
import {
  Radar,
  Layers,
  MapPin,
  ClipboardList,
  CheckCircle2,
  Clock,
  TriangleAlert,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface FieldCheckItem {
  id: string;
  area: string;
  title: string;
  description: string;
  state: "pending" | "complete";
}

const exampleChecks: FieldCheckItem[] = [
  {
    id: "check-1",
    area: "Example area A",
    title: "Rainfall observation",
    description: "Fictional field report · Awaiting review",
    state: "pending",
  },
  {
    id: "check-2",
    area: "Example area B",
    title: "Drainage check",
    description: "Fictional field report · Awaiting review",
    state: "pending",
  },
  {
    id: "check-3",
    area: "Example area C",
    title: "Vegetation check",
    description: "Fictional field report · Reviewed",
    state: "complete",
  },
];

const pipelineSources = [
  {
    name: "Weather forecasts",
    status: "Not configured · forecast age unavailable",
  },
  {
    name: "Satellite observations",
    status: "Not configured · valid coverage unavailable",
  },
  {
    name: "Historical rainfall",
    status: "Not configured · baseline unavailable",
  },
];

export function AdminWorkspace() {
  const [filter, setFilter] = useState<"all" | "pending" | "complete">("all");

  const visibleChecks = exampleChecks.filter((item) => {
    if (filter === "all") return true;
    return item.state === filter;
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/admin">
          <span className="brand-mark">
            <Radar size={21} />
          </span>
          IJURU SIGNAL
        </a>
        <p className="sidebar-label">ADMIN WORKSPACE</p>
        <nav aria-label="Admin workspace navigation">
          <a href="#overview" className="active">
            <Layers size={18} /> Operations overview
          </a>
          <a href="#checks">
            <ClipboardList size={18} /> Field checks
          </a>
          <a href="#sources">
            <Radar size={18} /> Data sources
          </a>
          <a href="/">
            <MapPin size={18} /> Location briefing
          </a>
        </nav>
        <p className="sidebar-bottom">
          Administrator reference
          <br />
          Illustrative mock data
        </p>
      </aside>

      <main className="main" id="overview">
        <header className="topbar">
          <a className="brand mobile-brand" href="/admin">
            <span className="brand-mark">
              <Radar size={20} />
            </span>
            IJURU SIGNAL
          </a>
          <strong className="desktop-title">Ijuru Signal · Admin Operations</strong>
          <div className="top-actions">
            <span className="top-status">Illustrative concept · Not connected</span>
            <a href="/" className="admin-nav-link">
              Open location view <ArrowUpRight size={15} />
            </a>
          </div>
        </header>

        <div className="content">
          <div className="heading">
            <div>
              <p className="eyebrow">ADMINISTRATION & TRIAGE</p>
              <h1>Operations overview</h1>
              <p>Review field observations, source freshness and ingestion status.</p>
            </div>
          </div>

          <div className="notice" role="alert">
            <strong>Illustrative prototype:</strong> The areas, counts and system statuses below are
            fictional representations. No live operations, authentication session or data sources
            are connected. For current weather advisories, consult{" "}
            <a href="https://www.meteorwanda.gov.rw/">Meteo Rwanda</a>.
          </div>

          <section className="stats-grid" aria-label="Example operations summary">
            <div className="stat-card">
              <span className="stat-label">Field checks pending</span>
              <strong className="stat-value">4</strong>
              <small className="stat-sub">Fictional records</small>
            </div>
            <div className="stat-card">
              <span className="stat-label">Sources needing attention</span>
              <strong className="stat-value">1</strong>
              <small className="stat-sub">Example status</small>
            </div>
            <div className="stat-card">
              <span className="stat-label">Areas configured</span>
              <strong className="stat-value">3</strong>
              <small className="stat-sub">Example areas</small>
            </div>
          </section>

          <div className="grid admin-grid">
            <section className="panel overview" id="checks">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">GROUND VERIFICATION</p>
                  <h2>Field check queue</h2>
                  <p>Example observations requiring follow-up or review.</p>
                </div>
                <label className="filter-label" htmlFor="check-filter">
                  <Filter size={15} />
                  <span>Filter</span>
                  <select
                    id="check-filter"
                    className="filter-select"
                    value={filter}
                    onChange={(e) =>
                      setFilter(e.target.value as "all" | "pending" | "complete")
                    }
                  >
                    <option value="all">All checks ({exampleChecks.length})</option>
                    <option value="pending">Pending</option>
                    <option value="complete">Complete</option>
                  </select>
                </label>
              </div>

              <div className="check-rows" role="region" aria-live="polite">
                {visibleChecks.length === 0 ? (
                  <p className="empty-state">No observations match the selected filter.</p>
                ) : (
                  visibleChecks.map((check) => (
                    <article className="check-row" key={check.id}>
                      <div className="check-row-main">
                        <strong>
                          {check.area} · {check.title}
                        </strong>
                        <small>{check.description}</small>
                      </div>
                      <span
                        className={`status-chip ${
                          check.state === "complete" ? "status-complete" : "status-pending"
                        }`}
                      >
                        {check.state === "complete" ? (
                          <>
                            <CheckCircle2 size={13} /> Complete
                          </>
                        ) : (
                          <>
                            <Clock size={13} /> Pending
                          </>
                        )}
                      </span>
                    </article>
                  ))
                )}
              </div>

              <p className="panel-footer-note">
                A real record displays the observation timestamp, author ID, associated boundary
                version and reviewer transition controls. Unauthenticated users cannot view or edit
                private field notes.
              </p>
            </section>

            <aside className="rail">
              <section className="panel admin-rail-panel" id="sources">
                <p className="eyebrow">INGESTION STATUS</p>
                <h2>Data pipeline</h2>
                <p className="rail-subtitle">
                  Example status only; external provider connections are unconfigured.
                </p>

                <div className="source-list">
                  {pipelineSources.map((s) => (
                    <div className="source-row" key={s.name}>
                      <strong>{s.name}</strong>
                      <small>{s.status}</small>
                    </div>
                  ))}
                </div>

                <a
                  className="link-with-icon"
                  href="https://github.com"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = "sources";
                  }}
                >
                  Inspect pipeline schema & specs
                </a>
              </section>

              <section className="panel action-panel">
                <p className="eyebrow">OFFICIAL WARNINGS</p>
                <h2>Official warnings</h2>
                <p>
                  Official warnings remain with Meteo Rwanda and local authorities. This administrative
                  dashboard does not issue forecasts or warnings.
                </p>
                <a
                  className="button"
                  href="https://www.meteorwanda.gov.rw/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Meteo Rwanda <ArrowUpRight size={15} />
                </a>
              </section>
            </aside>
          </div>

          <footer>
            <span>IJURU SIGNAL · ADMIN REFERENCE</span>
            <span>Human verification & audit discipline.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
