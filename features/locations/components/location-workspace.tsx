"use client";

import { useState } from "react";
import {
  CloudRain,
  Layers,
  MapPin,
  Radar,
  TriangleAlert,
  Waves,
  Sun,
  Mountain,
  ArrowUpRight,
} from "lucide-react";

const areas = [
  { value: "example", label: "Example location (demo)" },
  { value: "Kigali", label: "Kigali" },
  { value: "Bugesera", label: "Bugesera" },
  { value: "Musanze", label: "Musanze" },
  { value: "Rubavu", label: "Rubavu" },
  { value: "Nyagatare", label: "Nyagatare" },
];

const hazards = [
  {
    name: "Flooding & heavy rain",
    detail: "Forecast, rainfall and local reports",
    Icon: Waves,
    exampleState: "Example",
  },
  {
    name: "Landslides & erosion",
    detail: "Rainfall context and ground checks",
    Icon: Mountain,
    exampleState: "Not assessed",
  },
  {
    name: "Dry conditions",
    detail: "Historical rainfall and vegetation context",
    Icon: Sun,
    exampleState: "Not assessed",
  },
];

const sources = [
  {
    name: "Weather outlook",
    type: "Forecast",
    detail: "No forecast source is connected. Issue time and validity are unavailable.",
    Icon: CloudRain,
  },
  {
    name: "Satellite observations",
    type: "Observation",
    detail:
      "No satellite source is connected. Coverage, cloud filtering and observation dates are unavailable.",
    Icon: Layers,
  },
  {
    name: "Rainfall history",
    type: "Historical context",
    detail:
      "No historical rainfall source is connected. A baseline cannot be established here.",
    Icon: Radar,
  },
];

export function LocationWorkspace() {
  const [area, setArea] = useState("example");
  const [noteText, setNoteText] = useState("");
  const [feedback, setFeedback] = useState("");

  const isExample = area === "example";
  const selectedLabel =
    areas.find((a) => a.value === area)?.label || "No district selected";

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      setFeedback("Enter an observation to preview this action.");
      return;
    }
    setFeedback(
      "Preview only: this note has not been saved or sent. Private note storage and review are not configured yet."
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Radar size={21} />
          </span>
          IJURU SIGNAL
        </a>
        <p className="sidebar-label">YOUR WORKSPACE</p>
        <nav aria-label="Workspace navigation">
          <a href="#overview" className="active">
            <MapPin size={18} /> Location overview
          </a>
          <a href="#hazards">
            <TriangleAlert size={18} /> Hazards
          </a>
          <a href="#evidence">
            <Layers size={18} /> Evidence & sources
          </a>
          <a href="#field-check">
            <Radar size={18} /> Field checks
          </a>
          <a href="/admin">
            <Layers size={18} /> Admin reference
          </a>
        </nav>
        <p className="sidebar-bottom">
          Climate evidence workspace
          <br />
          Early implementation
        </p>
      </aside>

      <main className="main" id="overview">
        <header className="topbar">
          <a className="brand mobile-brand" href="/">
            <span className="brand-mark">
              <Radar size={20} />
            </span>
            IJURU SIGNAL
          </a>
          <strong className="desktop-title">Location overview</strong>
          <div className="top-actions">
            <span className="top-status">
              {isExample ? "Illustrative prototype" : "Sources not connected"}
            </span>
            <a href="/admin" className="admin-nav-link">
              Admin view <ArrowUpRight size={15} />
            </a>
          </div>
        </header>

        <div className="content">
          <div className="heading">
            <div>
              <p className="eyebrow">LOCATION BRIEFING</p>
              <h1>Understand your location</h1>
              <p>Explore evidence and the questions it can help you ask.</p>
            </div>
            <label className="location-label" htmlFor="location">
              Choose a district
              <select
                id="location"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setFeedback("");
                }}
              >
                {areas.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="notice" role="alert">
            {isExample ? (
              <>
                <strong>Illustrative prototype:</strong> This view demonstrates how future
                forecasts and field checks connect. Selecting a real district will not check its
                conditions. For current warnings, use{" "}
                <a href="https://www.meteorwanda.gov.rw/">Meteo Rwanda</a> and local authorities.
              </>
            ) : (
              <>
                <strong>Conditions cannot be checked here yet.</strong> No live forecast, observation
                or warning feed is connected for {selectedLabel}. Unavailable does not mean safe. For
                current guidance, consult{" "}
                <a href="https://www.meteorwanda.gov.rw/">Meteo Rwanda</a> and local authorities.
              </>
            )}
          </div>

          <div className="grid">
            <div>
              <section className="panel overview">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">SELECTED AREA</p>
                    <h2>{isExample ? "Example location" : selectedLabel}</h2>
                    <p>
                      {isExample
                        ? "Illustrative situation · not a real place or event"
                        : "District selected · live boundaries and feeds are unconfigured"}
                    </p>
                  </div>
                  <span className={`badge ${isExample ? "badge-demo" : ""}`}>
                    {isExample ? "Example only" : "Data unavailable"}
                  </span>
                </div>

                <div className="status-box">
                  <TriangleAlert size={23} aria-hidden="true" />
                  <div>
                    <h3>
                      {isExample
                        ? "Example: heavy rain needs a closer look"
                        : "No local assessment available"}
                    </h3>
                    <p>
                      {isExample
                        ? "This example shows how a future briefing could connect weather context with ground observations. It is not an official warning."
                        : "Sources and approved area boundaries have not been configured. This workspace does not issue risk scores or warnings."}
                    </p>
                    <a
                      href="https://www.meteorwanda.gov.rw/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Check official forecasts <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>

                <div id="hazards" className="hazards">
                  <div className="section-heading">
                    <h3>Hazards to explore</h3>
                    <span>{isExample ? "Example breakdown" : "Not assessed"}</span>
                  </div>
                  <p className="section-intro">
                    These categories are starting points for a field conversation, not predictions.
                  </p>
                  <div className="hazard-list">
                    {hazards.map(({ name, detail, Icon, exampleState }) => (
                      <div className="hazard" key={name}>
                        <span className="hazard-icon">
                          <Icon size={20} />
                        </span>
                        <div>
                          <strong>{name}</strong>
                          <small>{detail}</small>
                        </div>
                        <span className="state">
                          {isExample ? exampleState : "Unavailable"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section id="evidence" className="evidence-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">EVIDENCE</p>
                    <h2>What we can check</h2>
                  </div>
                  <span>
                    {isExample ? "Illustrative cards" : "Sources not configured"}
                  </span>
                </div>
                <p>
                  Each source needs a date, coverage and quality information before it can support a
                  briefing.
                </p>
                <div className="source-grid">
                  {sources.map(({ name, type, detail, Icon }) => (
                    <article className="source-card" key={name}>
                      <div className="source-top">
                        <Icon size={21} />
                        <span>{type}</span>
                      </div>
                      <h3>{name}</h3>
                      <p>{detail}</p>
                      <strong>{isExample ? "Preview only" : "Unavailable"}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="rail">
              <section className="panel area-panel">
                <p className="eyebrow">AREA SELECTION</p>
                <h2>{isExample ? "Example boundary" : selectedLabel}</h2>
                <div className="area-placeholder">
                  <MapPin size={30} />
                  <span>
                    {isExample
                      ? "Illustrative placeholder · not a real map"
                      : "Boundary unavailable"}
                  </span>
                </div>
                <p>
                  District names are provided for navigation only. Verified boundaries, coordinate
                  validations and provenance have not been approved for public presentation.
                </p>
              </section>

              <section className="panel action-panel">
                <p className="eyebrow">OFFICIAL GUIDANCE</p>
                <h2>Start with the official source</h2>
                <p>
                  For current forecasts and warnings, follow Meteo Rwanda and local authority
                  guidance.
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

          <section className="panel field-panel" id="field-check">
            <div>
              <p className="eyebrow">HUMAN VERIFICATION</p>
              <h2>Field observations</h2>
              <p>
                A field check can add local context to a briefing. Capture what was observed on the
                ground alongside available evidence.
              </p>
              <form className="note-form" onSubmit={handleNoteSubmit}>
                <label htmlFor="note-input" className="sr-only">
                  Field observation
                </label>
                <textarea
                  id="note-input"
                  className="note-textarea"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Describe an observation (e.g. soil moisture, visible runoff, crop condition)..."
                  rows={2}
                />
                <button className="button button-outline" type="submit">
                  Preview note
                </button>
              </form>
              {feedback && (
                <p className="feedback-text" role="status" aria-live="polite">
                  {feedback}
                </p>
              )}
            </div>
            <span className="badge">Preview only</span>
          </section>

          <footer>
            <span>IJURU SIGNAL · EARLY IMPLEMENTATION</span>
            <span>Evidence supports human judgment.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
