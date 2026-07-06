"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { EXPORT_ALLOWED_ROLES, type AdminRole } from "@/app/lib/permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = {
  _id: string;
  bookingId?: string;
  name?: string;
  phone?: string;
  service?: string;
  location?: string;
  date?: string;
  time?: string;
  status?: string;
  concern?: string;
  createdAt?: string;
};

type AuditLog = {
  _id: string;
  adminName: string;
  adminEmail: string;
  adminRole: string;
  branch: string;
  filters: Record<string, string>;
  recordCount: number;
  ipAddress: string;
  exportedAt: string;
};

type Filters = {
  dateFrom: string;
  dateTo: string;
  location: string;
  status: string;
  service: string;
  search: string;
};

const EMPTY_FILTERS: Filters = {
  dateFrom: "", dateTo: "", location: "", status: "", service: "", search: "",
};

const STATUS_COLORS: Record<string, string> = {
  new:       "bg-green-100 text-green-700",
  confirmed: "bg-blue-100 text-blue-700",
  done:      "bg-gray-100 text-gray-600",
};

// ─── Export Modal ─────────────────────────────────────────────────────────────

function ExportModal({
  filters,
  onClose,
}: {
  filters: Filters;
  onClose: () => void;
}) {
  const [phase,     setPhase]     = useState<"confirm" | "authing" | "ready">("confirm");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState("");
  const [count,     setCount]     = useState(0);
  const [dlUrl,     setDlUrl]     = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const hasFilter = Boolean(filters.dateFrom || filters.dateTo || filters.location || filters.status || filters.service);

  const requestExport = async () => {
    if (!password) { setError("Please enter your password."); return; }
    setPhase("authing");
    setError("");
    try {
      const res  = await fetch("/api/admin/leads/export", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          password,
          dateFrom: filters.dateFrom || undefined,
          dateTo:   filters.dateTo   || undefined,
          location: filters.location || undefined,
          status:   filters.status   || undefined,
          service:  filters.service  || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setCount(data.count);
      setDlUrl(data.downloadUrl);
      setExpiresAt(
        new Date(data.expiresAt).toLocaleTimeString("en-IN", {
          hour: "2-digit", minute: "2-digit", hour12: true,
        })
      );
      setPhase("ready");
    } catch (err: any) {
      setError(err.message || "Export failed");
      setPhase("confirm");
    }
  };

  const triggerDownload = () => {
    const a = document.createElement("a");
    a.href = dlUrl;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-[#0B2545] px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">📤</span>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Export Patient Leads</h2>
            <p className="text-blue-200 text-xs">Secure export — this action will be logged</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Confirm / authing phase */}
          {phase !== "ready" && (
            <>
              {/* Audit warning */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">This export will be recorded in the audit log.</p>
                  <p>Your name, email, IP address, filters, and record count will be stored permanently.</p>
                </div>
              </div>

              {/* Filter summary */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Export Filters</p>
                {filters.dateFrom  && <p className="text-sm text-gray-700">📅 From: <span className="font-medium">{filters.dateFrom}</span></p>}
                {filters.dateTo    && <p className="text-sm text-gray-700">📅 To: <span className="font-medium">{filters.dateTo}</span></p>}
                {filters.location  && <p className="text-sm text-gray-700">📍 Branch: <span className="font-medium">{filters.location}</span></p>}
                {filters.status    && <p className="text-sm text-gray-700">📋 Status: <span className="font-medium capitalize">{filters.status}</span></p>}
                {filters.service   && <p className="text-sm text-gray-700">🩺 Service: <span className="font-medium">{filters.service}</span></p>}
                {!hasFilter        && <p className="text-sm text-red-600">No filters selected — at least one is required.</p>}
              </div>

              {/* Password re-auth */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Confirm your password to proceed
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && hasFilter && requestExport()}
                  placeholder="Enter your admin password"
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  disabled={phase === "authing"}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={requestExport}
                  disabled={phase === "authing" || !hasFilter || !password}
                  className="flex-1 bg-[#0B2545] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#1a3a6e] disabled:opacity-40 transition flex items-center justify-center gap-2"
                >
                  {phase === "authing"
                    ? <><span className="inline-block animate-spin">↻</span> Verifying…</>
                    : "Export"}
                </button>
              </div>
            </>
          )}

          {/* Ready phase — download link */}
          {phase === "ready" && (
            <div className="space-y-5">
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex gap-3">
                <span className="text-2xl">✅</span>
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Export ready — {count} record{count !== 1 ? "s" : ""}</p>
                  <p>
                    Your download link expires at <strong>{expiresAt}</strong> and can only be used once.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { triggerDownload(); onClose(); }}
                className="w-full bg-green-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                ⬇️ Download CSV
              </button>
              <button
                onClick={onClose}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Log Tab ─────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [logs,       setLogs]       = useState<AuditLog[]>([]);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/leads/export/audit?page=${page}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load audit log");
      setLogs(data.logs ?? []);
      setTotalPages(data.totalPages ?? 1);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

  const fmtFilters = (f: Record<string, string>) =>
    Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—";

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}
      {loading && <p className="text-sm text-gray-500">Loading audit log…</p>}

      {!loading && logs.length === 0 && !error && (
        <p className="text-sm text-gray-500">No exports have been performed yet.</p>
      )}

      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Exported By</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Filters</th>
                  <th className="px-4 py-3 text-right">Records</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{log.adminName}</p>
                      <p className="text-xs text-gray-500">{log.adminEmail}</p>
                      <p className="text-xs text-gray-400 capitalize">{log.adminRole.replace(/_/g, " ")}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.branch}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={fmtFilters(log.filters)}>
                      {fmtFilters(log.filters)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{log.recordCount}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ipAddress}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(log.exportedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${page === i + 1 ? "bg-[#0B2545] text-white" : "bg-gray-200 hover:bg-gray-300"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

export default function LeadsClient({
  userRole,
  assignedClinics,
}: {
  userRole: AdminRole;
  assignedClinics: string[];
}) {
  const canExport      = EXPORT_ALLOWED_ROLES.includes(userRole);
  const branchRestricted = !assignedClinics.includes("all");

  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [filters,      setFilters]      = useState<Filters>(EMPTY_FILTERS);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [showExport,   setShowExport]   = useState(false);
  const [activeTab,    setActiveTab]    = useState<"leads" | "audit">("leads");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo)   params.set("dateTo",   filters.dateTo);
      if (filters.location) params.set("location", filters.location);
      if (filters.status)   params.set("status",   filters.status);
      if (filters.service)  params.set("service",  filters.service);
      if (filters.search)   params.set("search",   filters.search);

      const res  = await fetch(`/api/admin/leads?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load leads");
      setLeads(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const setFilter = (key: keyof Filters, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(1); };

  const hasAnyFilter    = Object.values(filters).some(Boolean);
  const hasExportFilter = Boolean(filters.dateFrom || filters.dateTo || filters.location || filters.status || filters.service);

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Leads</h1>
          {branchRestricted && (
            <p className="text-sm text-amber-700 mt-0.5">
              🔒 Branch-restricted view — showing: <strong>{assignedClinics.join(", ")}</strong>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium">
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-4 py-2 transition ${activeTab === "leads" ? "bg-[#0B2545] text-white" : "hover:bg-gray-50 text-gray-600"}`}
            >
              📋 Leads
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 transition border-l border-gray-200 ${activeTab === "audit" ? "bg-[#0B2545] text-white" : "hover:bg-gray-50 text-gray-600"}`}
            >
              📜 Audit Log
            </button>
          </div>

          {/* Export button — only for allowed roles */}
          {canExport && activeTab === "leads" && (
            <button
              onClick={() => setShowExport(true)}
              disabled={!hasExportFilter}
              title={!hasExportFilter ? "Apply at least one filter to enable export" : "Export filtered leads to CSV"}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              📤 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Audit log tab */}
      {activeTab === "audit" && <AuditLogTab />}

      {/* Leads tab */}
      {activeTab === "leads" && (
        <>
          {/* Filter panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilter("dateTo", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Branch</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilter("location", e.target.value)}
                  placeholder="e.g. Anna Nagar"
                  disabled={branchRestricted}
                  title={branchRestricted ? `Restricted to: ${assignedClinics.join(", ")}` : undefined}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Service</label>
                <input
                  type="text"
                  value={filters.service}
                  onChange={(e) => setFilter("service", e.target.value)}
                  placeholder="e.g. Skin, Hair"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  placeholder="Name or phone"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {hasAnyFilter && (
              <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-600 underline transition">
                Clear all filters
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Result count + export hint */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{loading ? "Loading…" : `${total.toLocaleString()} lead${total !== 1 ? "s" : ""} found`}</span>
            {canExport && !hasExportFilter && !loading && (
              <span className="text-amber-600 text-xs">Apply at least one filter to enable export</span>
            )}
          </div>

          {/* Table */}
          {!loading && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {leads.length === 0 ? (
                <div className="px-6 py-16 text-center text-gray-400">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-medium">No leads match the current filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Appointment</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Lead Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leads.map((lead) => (
                        <tr key={lead._id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{lead.name || "—"}</p>
                            <p className="text-xs text-gray-500">{lead.phone || ""}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{lead.service || "—"}</td>
                          <td className="px-4 py-3 text-gray-700">{lead.location || "—"}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {lead.date ? `${lead.date}${lead.time ? ` · ${lead.time}` : ""}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[lead.status || "new"] || "bg-gray-100 text-gray-600"}`}>
                              {lead.status || "new"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(lead.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded text-sm ${page === i + 1 ? "bg-[#0B2545] text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Export modal */}
      {showExport && (
        <ExportModal filters={filters} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
