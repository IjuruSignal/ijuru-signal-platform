'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Send,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CopilotChat } from '@/features/ai/components/copilot-chat.tsx';

interface AreaOption {
  value: string;
  label: string;
}

const DEFAULT_AREAS: AreaOption[] = [
  { value: 'kigali', label: 'Kigali' },
  { value: 'bugesera', label: 'Bugesera' },
  { value: 'musanze', label: 'Musanze' },
  { value: 'rubavu', label: 'Rubavu' },
  { value: 'nyagatare', label: 'Nyagatare' },
  { value: 'example', label: 'Example location (demo)' },
];

export function LocationWorkspace() {
  const [area, setArea] = useState('kigali');
  const [areasList, setAreasList] = useState<AreaOption[]>(DEFAULT_AREAS);
  const [signals, setSignals] = useState<any>(null);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [fieldChecks, setFieldChecks] = useState<any[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; login?: string }>({
    id: 'user-field-01',
    role: 'user',
    login: 'field@ijuru.rw',
  });

  const isExample = area === 'example';
  const selectedLabel = areasList.find((a) => a.value === area)?.label || area;

  // 1. Fetch current user and areas on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => {
        if (data.areas && Array.isArray(data.areas) && data.areas.length > 0) {
          const mapped = data.areas.map((a: any) => ({
            value: a.id,
            label: a.name,
          }));
          mapped.push({ value: 'example', label: 'Example location (demo)' });
          setAreasList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch signals and field checks whenever area changes
  useEffect(() => {
    if (isExample) {
      setSignals(null);
      setFieldChecks([]);
      return;
    }

    setLoadingSignals(true);
    fetch(`/api/signals/${area}`)
      .then((res) => res.json())
      .then((data) => {
        setSignals(data);
      })
      .catch(() => {})
      .finally(() => setLoadingSignals(false));

    setLoadingChecks(true);
    fetch(`/api/field-checks?areaId=${area}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.checks) setFieldChecks(data.checks);
      })
      .catch(() => {})
      .finally(() => setLoadingChecks(false));
  }, [area, isExample]);

  // Handle switching roles
  const handleSwitchRole = async (targetRole: 'user' | 'reviewer' | 'admin') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        // Refresh checks with new role permissions
        if (!isExample) {
          fetch(`/api/field-checks?areaId=${area}`)
            .then((r) => r.json())
            .then((d) => d.checks && setFieldChecks(d.checks))
            .catch(() => {});
        }
      }
    } catch {}
  };

  // 3. Handle field check submission
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      setFeedback('Enter an observation note to submit.');
      return;
    }

    if (isExample) {
      setFeedback('Example preview: observations for the demo location are not stored in the database.');
      return;
    }

    setSubmittingNote(true);
    setFeedback('');

    try {
      const res = await fetch('/api/field-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId: area,
          observation: noteText.trim(),
          observedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit check');

      setFeedback(`✓ Observation recorded successfully (ID: ${data.id.slice(0, 8)}). Awaiting reviewer check.`);
      setNoteText('');

      // Optimistic update
      setFieldChecks((prev) => [data.fieldCheck, ...prev]);
    } catch (err: any) {
      setFeedback(`Error submitting observation: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
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
          <a href="#copilot">
            <Sparkles size={18} /> Climate Copilot
          </a>
          <a href="/admin">
            <ShieldCheck size={18} /> Admin triage
          </a>
        </nav>

        {/* Role Switcher in Sidebar */}
        <div className="mt-8 pt-4 border-t border-teal-800/40 text-xs">
          <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold mb-2 text-teal-200">
            Active Role ({currentUser.role})
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleSwitchRole('user')}
              className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                currentUser.role === 'user' ? 'bg-teal-700 text-white font-bold' : 'text-teal-200 hover:bg-teal-800/40'
              }`}
            >
              🧑‍🌾 Field Officer
            </button>
            <button
              type="button"
              onClick={() => handleSwitchRole('reviewer')}
              className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                currentUser.role === 'reviewer' ? 'bg-teal-700 text-white font-bold' : 'text-teal-200 hover:bg-teal-800/40'
              }`}
            >
              🔍 Reviewer / Agronomist
            </button>
            <button
              type="button"
              onClick={() => handleSwitchRole('admin')}
              className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                currentUser.role === 'admin' ? 'bg-teal-700 text-white font-bold' : 'text-teal-200 hover:bg-teal-800/40'
              }`}
            >
              🛡️ System Admin
            </button>
          </div>
        </div>

        <p className="sidebar-bottom">
          Climate evidence workspace
          <br />
          Full End-to-End Demo
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
          <strong className="desktop-title">District Climate Signal Workspace</strong>
          <div className="top-actions">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200">
              <UserCheck size={14} className="text-teal-600" />
              <span>{currentUser.role.toUpperCase()}</span>
            </div>
            <span className="top-status">
              {isExample ? 'Illustrative prototype' : signals?.weather ? 'Live Feeds Active' : 'Loading Feeds...'}
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
              <h1>{selectedLabel} Climate Overview</h1>
              <p>Explore verified evidence, satellite NDVI, rainfall anomalies, and human field checks.</p>
            </div>
            <label className="location-label" htmlFor="location">
              Choose a district
              <select
                id="location"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setFeedback('');
                }}
              >
                {areasList.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Official Meteo Warning / Notice Banner */}
          <div className="notice" role="alert">
            {isExample ? (
              <>
                <strong>Illustrative prototype:</strong> This view demonstrates how forecasts, satellite observations,
                and field checks connect. For current official warnings, visit{' '}
                <a href="https://www.meteorwanda.gov.rw/" target="_blank" rel="noreferrer">
                  Meteo Rwanda
                </a>
                .
              </>
            ) : signals?.officialAdvisory ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong>Official Meteo Rwanda Advisory:</strong> {signals.officialAdvisory.title} —{' '}
                  <span className="italic">{signals.officialAdvisory.bulletin}</span> (Valid until{' '}
                  {signals.officialAdvisory.validUntil})
                </div>
                <a
                  href={signals.officialAdvisory.link}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap font-bold underline"
                >
                  View Bulletin <ArrowUpRight size={12} className="inline" />
                </a>
              </div>
            ) : (
              <>
                <strong>Official Warning Link:</strong> For live national meteorological bulletins and alerts, consult{' '}
                <a href="https://www.meteorwanda.gov.rw/" target="_blank" rel="noreferrer">
                  Meteo Rwanda
                </a>
                .
              </>
            )}
          </div>

          <div className="grid">
            <div>
              {/* Overview panel */}
              <section className="panel overview">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">ACTIVE DISTRICT</p>
                    <h2>{isExample ? 'Example location' : selectedLabel}</h2>
                    <p>
                      {isExample
                        ? 'Illustrative situation · not a real place or event'
                        : `District coordinates loaded · ${signals?.weather?.source || 'Calibrated feeds'}`}
                    </p>
                  </div>
                  <span className={`badge ${isExample ? 'badge-demo' : ''}`}>
                    {isExample ? 'Example only' : signals ? 'Feeds Connected' : 'Loading...'}
                  </span>
                </div>

                {/* Weather Forecast Strip */}
                {signals?.weather && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CloudRain size={15} className="text-teal-600" />
                        5-Day Weather Forecast & Rain Probability
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        Current: {signals.weather.temperatureC}°C, Humidity: {signals.weather.humidity}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                      {signals.weather.forecastDays.slice(0, 5).map((f: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-lg p-2.5 text-center">
                          <p className="text-[11px] font-bold text-muted-foreground">{f.date}</p>
                          <p className="text-sm font-semibold mt-1">
                            {f.tempMax}° / <span className="text-muted-foreground text-xs">{f.tempMin}°</span>
                          </p>
                          <div className="mt-2 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 py-0.5 rounded">
                            {f.precipProb}% rain
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">{f.precipMm} mm</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hazards Explorer */}
                <div id="hazards" className="hazards">
                  <div className="section-heading">
                    <h3>Hazards Context & Indicators</h3>
                    <span>{isExample ? 'Example breakdown' : 'Verified Fixtures'}</span>
                  </div>
                  <p className="section-intro">
                    Categories provide situational awareness for agronomists, not automated hazard alerts.
                  </p>

                  <div className="hazard-list">
                    <div className="hazard">
                      <span className="hazard-icon">
                        <Waves size={20} />
                      </span>
                      <div>
                        <strong>Heavy Rain & Surface Runoff</strong>
                        <small>
                          {signals
                            ? `${signals.weather?.forecastDays[0]?.precipProb}% rain chance today (${signals.weather?.forecastDays[0]?.precipMm} mm)`
                            : 'Rainfall forecast and drainage checks'}
                        </small>
                      </div>
                      <span className="state">
                        {isExample ? 'Example' : signals?.weather ? 'Forecast Active' : 'Unavailable'}
                      </span>
                    </div>

                    <div className="hazard">
                      <span className="hazard-icon">
                        <Sun size={20} />
                      </span>
                      <div>
                        <strong>Moisture Balance & Historical Anomaly</strong>
                        <small>
                          {signals?.rainfall
                            ? `${signals.rainfall.status} (${signals.rainfall.diffMm >= 0 ? '+' : ''}${signals.rainfall.diffMm} mm vs 30yr CHIRPS norm)`
                            : 'Historical rainfall context'}
                        </small>
                      </div>
                      <span className="state">
                        {isExample ? 'Not assessed' : signals?.rainfall ? signals.rainfall.status : 'Unavailable'}
                      </span>
                    </div>

                    <div className="hazard">
                      <span className="hazard-icon">
                        <Mountain size={20} />
                      </span>
                      <div>
                        <strong>Vegetative Biomass / Canopy Health</strong>
                        <small>
                          {signals?.satellite
                            ? `Sentinel-2 NDVI: ${signals.satellite.ndvi} · ${signals.satellite.status}`
                            : 'Satellite NDVI observations'}
                        </small>
                      </div>
                      <span className="state">
                        {isExample ? 'Not assessed' : signals?.satellite ? `NDVI ${signals.satellite.ndvi}` : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Evidence & Sources Section */}
              <section id="evidence" className="evidence-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">EVIDENCE BASE</p>
                    <h2>Connected Signal Sources</h2>
                  </div>
                  <span>{isExample ? 'Illustrative cards' : 'Verified Ingest Data'}</span>
                </div>
                <p>
                  Every observation retains capture dates, coverage quality, and explicit processing provenance.
                </p>

                <div className="source-grid">
                  {/* Weather Source */}
                  <article className="source-card">
                    <div className="source-top">
                      <CloudRain size={21} />
                      <span>Forecast</span>
                    </div>
                    <h3>Open-Meteo & Weather Station</h3>
                    <p>
                      {signals?.weather
                        ? `5-day forecast, temperature, humidity, and rainfall probability updated for ${selectedLabel}.`
                        : 'Forecast and station observations unavailable.'}
                    </p>
                    <strong>{signals?.weather?.status === 'live' ? 'Live HTTPS Ingest' : 'Calibrated Baseline'}</strong>
                  </article>

                  {/* Satellite Source */}
                  <article className="source-card">
                    <div className="source-top">
                      <Layers size={21} />
                      <span>Copernicus Sentinel-2</span>
                    </div>
                    <h3>Sentinel-2 L2A NDVI</h3>
                    <p>
                      {signals?.satellite
                        ? `NDVI: ${signals.satellite.ndvi}. Pass date: ${signals.satellite.passDate}. Quality: ${signals.satellite.quality}.`
                        : 'Satellite pass data unavailable.'}
                    </p>
                    <strong>{isExample ? 'Preview only' : 'SCL Cloud Filtered'}</strong>
                  </article>

                  {/* CHIRPS Source */}
                  <article className="source-card">
                    <div className="source-top">
                      <Radar size={21} />
                      <span>CHIRPS Historical</span>
                    </div>
                    <h3>Rainfall Anomaly Baseline</h3>
                    <p>
                      {signals?.rainfall
                        ? `Seasonal total: ${signals.rainfall.targetMm} mm vs 30-year baseline ${signals.rainfall.baselineMeanMm} mm.`
                        : 'Historical baseline unavailable.'}
                    </p>
                    <strong>{signals?.rainfall ? `${signals.rainfall.percent}% of Baseline` : 'Unavailable'}</strong>
                  </article>
                </div>
              </section>

              {/* AI Copilot Interactive Chat Embed */}
              <section id="copilot" className="mt-6">
                <CopilotChat districtId={area} districtName={selectedLabel} />
              </section>
            </div>

            {/* Right rail */}
            <aside className="rail">
              <section className="panel area-panel">
                <p className="eyebrow">DISTRICT BOUNDARY</p>
                <h2>{isExample ? 'Example boundary' : selectedLabel}</h2>
                <div className="area-placeholder">
                  <MapPin size={30} />
                  <span>
                    {isExample
                      ? 'Illustrative placeholder · not a real map'
                      : `Verified GeoJSON Polygon (v1)`}
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Accessible map-free representation
                  </span>
                </div>
                <p>
                  District boundaries are versioned with SHA-256 provenance hashes and strict coordinate validation.
                </p>
              </section>

              <section className="panel action-panel">
                <p className="eyebrow">OFFICIAL METEO RWANDA</p>
                <h2>National Guidance</h2>
                <p>
                  Weather advisories are referenced from official bulletins. Ijuru Signal does not replace official warnings.
                </p>
                <a
                  className="button"
                  href={signals?.officialAdvisory?.link || 'https://www.meteorwanda.gov.rw/'}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Meteo Rwanda <ArrowUpRight size={15} />
                </a>
              </section>
            </aside>
          </div>

          {/* Field Observations & Checks Section */}
          <section className="panel field-panel" id="field-check">
            <div className="w-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">HUMAN GROUND VERIFICATION</p>
                  <h2>Field Observations for {selectedLabel}</h2>
                </div>
                <span className="badge">
                  {fieldChecks.length} Observation{fieldChecks.length === 1 ? '' : 's'} Logged
                </span>
              </div>
              <p className="mt-1">
                Field checks ground remote sensing with observations from local agricultural extension workers.
              </p>

              {/* Field check submission form */}
              <form className="note-form" onSubmit={handleNoteSubmit}>
                <label htmlFor="note-input" className="sr-only">
                  Field observation
                </label>
                <textarea
                  id="note-input"
                  className="note-textarea"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={`Describe a field observation in ${selectedLabel} (e.g. soil moisture, crop stage, visible runoff)...`}
                  rows={2}
                />
                <button
                  className="button"
                  type="submit"
                  disabled={submittingNote || !noteText.trim()}
                >
                  <Send size={14} /> Submit Check
                </button>
              </form>

              {feedback && (
                <p className="feedback-text text-sm font-medium mt-2 text-teal-800" role="status" aria-live="polite">
                  {feedback}
                </p>
              )}

              {/* List of existing field checks */}
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Recent Ground Checks
                </h4>
                {loadingChecks ? (
                  <p className="text-xs text-muted-foreground">Loading field observations...</p>
                ) : fieldChecks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No field checks recorded for this district yet.</p>
                ) : (
                  <div className="space-y-2">
                    {fieldChecks.map((fc) => (
                      <div
                        key={fc.id}
                        className="bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-lg p-3 text-sm flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">{fc.observation}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {new Date(fc.observed_at || fc.created_at).toLocaleDateString()}
                            </span>
                            <span>Author: {fc.author_id}</span>
                            <span>Version: v{fc.version}</span>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                            fc.status === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {fc.status === 'reviewed' ? (
                            <>
                              <CheckCircle2 size={12} /> Reviewed
                            </>
                          ) : (
                            <>
                              <Clock size={12} /> Pending Review
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <footer>
            <span>IJURU SIGNAL · END-TO-END DEMO</span>
            <span>Satellite evidence & ground checks empower human judgment.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
