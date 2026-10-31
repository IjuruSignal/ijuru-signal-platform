'use client';

import React, { useState, useEffect } from 'react';
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
  Check,
  RefreshCw,
  ShieldAlert,
  Database,
  CloudRain,
  UserCheck,
} from 'lucide-react';

interface FieldCheckItem {
  id: string;
  area_id: string;
  author_id: string;
  observation: string;
  observed_at: string;
  status: 'pending' | 'reviewed';
  version: number;
}

export function AdminWorkspace() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [checks, setChecks] = useState<FieldCheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; login?: string }>({
    id: 'user-admin-01',
    role: 'admin',
    login: 'admin@ijuru.rw',
  });

  const loadData = () => {
    setLoading(true);
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    // Fetch across districts
    fetch('/api/field-checks?areaId=kigali')
      .then((res) => res.json())
      .then((data) => {
        if (data.checks) setChecks(data.checks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

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
        loadData();
      }
    } catch {}
  };

  const handleReview = async (check: FieldCheckItem) => {
    setReviewingId(check.id);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/field-checks/${check.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: check.version }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review check');

      setActionMessage(`✓ Observation ${check.id.slice(0, 8)} successfully approved & marked reviewed.`);

      // Optimistic update
      setChecks((prev) =>
        prev.map((c) => (c.id === check.id ? { ...c, status: 'reviewed', version: c.version + 1 } : c))
      );
    } catch (err: any) {
      setActionMessage(`Review failed: ${err.message}. ${currentUser.role === 'user' ? '(Requires Reviewer or Admin role)' : ''}`);
    } finally {
      setReviewingId(null);
    }
  };

  const visibleChecks = checks.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const pendingCount = checks.filter((c) => c.status === 'pending').length;
  const reviewedCount = checks.filter((c) => c.status === 'reviewed').length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/admin">
          <span className="brand-mark">
            <Radar size={21} />
          </span>
          IJURU SIGNAL
        </a>
        <p className="sidebar-label">ADMIN & REVIEW TRIAGE</p>
        <nav aria-label="Admin workspace navigation">
          <a href="#overview" className="active">
            <Layers size={18} /> Operations triage
          </a>
          <a href="#checks">
            <ClipboardList size={18} /> Field check review ({pendingCount})
          </a>
          <a href="#sources">
            <Radar size={18} /> Signal pipelines
          </a>
          <a href="/">
            <MapPin size={18} /> Location briefing
          </a>
        </nav>

        {/* Role Switcher in Sidebar */}
        <div className="mt-8 pt-4 border-t border-teal-800/40 text-xs">
          <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold mb-2 text-teal-200">
            Active Identity ({currentUser.role})
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleSwitchRole('admin')}
              className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                currentUser.role === 'admin' ? 'bg-teal-700 text-white font-bold' : 'text-teal-200 hover:bg-teal-800/40'
              }`}
            >
              🛡️ System Admin
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
              onClick={() => handleSwitchRole('user')}
              className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                currentUser.role === 'user' ? 'bg-teal-700 text-white font-bold' : 'text-teal-200 hover:bg-teal-800/40'
              }`}
            >
              🧑‍🌾 Field Officer
            </button>
          </div>
        </div>

        <p className="sidebar-bottom">
          Administrator reference
          <br />
          Dual-Database Verified
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
          <strong className="desktop-title">Field Observation Review & Pipeline Operations</strong>
          <div className="top-actions">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200">
              <UserCheck size={14} className="text-teal-600" />
              <span>{currentUser.role.toUpperCase()}</span>
            </div>
            <span className="top-status">Active Triage Console</span>
            <a href="/" className="admin-nav-link">
              Briefing view <ArrowUpRight size={15} />
            </a>
          </div>
        </header>

        <div className="content">
          <div className="heading">
            <div>
              <p className="eyebrow">ADMINISTRATIVE OPERATIONS</p>
              <h1>Field Review & Signal Health</h1>
              <p>Triage pending field observations, verify optimistic locking, and inspect pipeline ingest status.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="button button-outline text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className="notice mb-4" role="alert">
              <strong>Action Status:</strong> {actionMessage}
            </div>
          )}

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pending Review</p>
                <h3 className="text-2xl font-bold mt-1 text-amber-600">{pendingCount}</h3>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-60" />
            </div>

            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reviewed Observations</p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600">{reviewedCount}</h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>

            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Database Engine</p>
                <h3 className="text-xl font-bold mt-1 text-teal-700">SQLite & PG18</h3>
              </div>
              <Database className="w-8 h-8 text-teal-600 opacity-60" />
            </div>
          </div>

          {/* Field Checks Triage Section */}
          <section className="panel p-6 mb-6" id="checks">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <p className="eyebrow">OBSERVATION TRIAGE</p>
                <h2 className="text-xl font-bold">Field Checks Queue</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reviewers approve ground checks with optimistic version fencing and audit logging.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === 'all' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({checks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === 'pending' ? 'bg-white shadow text-amber-700' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('reviewed')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    filter === 'reviewed' ? 'bg-white shadow text-emerald-700' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Reviewed ({reviewedCount})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                Loading field checks queue...
              </div>
            ) : visibleChecks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground italic border border-dashed rounded-lg">
                No observations matching the filter.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {visibleChecks.map((check) => (
                  <div key={check.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{check.observation}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            check.status === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {check.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1.5">
                        <span>District: <strong className="text-foreground">{check.area_id.toUpperCase()}</strong></span>
                        <span>Author: {check.author_id}</span>
                        <span>Date: {new Date(check.observed_at).toLocaleString()}</span>
                        <span>Version: v{check.version}</span>
                      </div>
                    </div>

                    {check.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleReview(check)}
                        disabled={reviewingId === check.id}
                        className="button text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800"
                      >
                        {reviewingId === check.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Approve / Mark Reviewed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pipelines & System Health Section */}
          <section className="panel p-6" id="sources">
            <div className="mb-4">
              <p className="eyebrow">INGEST PIPELINES</p>
              <h2 className="text-xl font-bold">Signal Sources & Grounding Health</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitoring live endpoints, fixture calibration, and strict non-hallucination validation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-border/80 rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-sm">Weather Pipeline</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">LIVE</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Open-Meteo & Meteo Rwanda regional station. 15-minute deterministic caching layer.
                </p>
              </div>

              <div className="border border-border/80 rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-sm">Sentinel-2 NDVI</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">VERIFIED</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copernicus L2A surface reflectance. SCL cloud filtering with zero-denominator safety.
                </p>
              </div>

              <div className="border border-border/80 rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Radar className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-sm">CHIRPS Baseline</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">VERIFIED</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  30-year rainfall anomaly comparison. Full matching-month completeness check.
                </p>
              </div>
            </div>
          </section>

          <footer className="mt-8">
            <span>IJURU SIGNAL · ADMIN REFERENCE</span>
            <span>Operations triage & ground truth verification.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
