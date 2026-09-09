"use client";

// Extracted from app/admin/leads/LeadsClient.tsx (originally built there
// only) so every admin surface over the Booking collection — Leads AND
// Bookings CRM — goes through the ONE secure, audited export path
// (password re-auth, mandatory filter, role/field allow-list, one-time
// signed download token, watermarked CSV; see
// app/api/admin/leads/export/route.ts + .../download/[token]/route.ts).
//
// Before this extraction, Bookings had its OWN, separate, fully
// unprotected client-side CSV export (built straight from whatever was
// already loaded in the browser, no auth check, no filter requirement, no
// audit trail) — meaning any role that could open the Bookings page at
// all (receptionist, customer_support, doctor — none of whom are on
// EXPORT_ALLOWED_ROLES) could silently walk away with the entire lead
// database. Reusing this one component/pipeline everywhere closes that
// gap by removing the insecure duplicate rather than bolting more
// controls onto it.

import { useEffect, useRef, useState } from "react";

export type LeadExportFilters = {
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  status?: string;
  service?: string;
};

export function hasLeadExportFilter(filters: LeadExportFilters): boolean {
  return Boolean(filters.dateFrom || filters.dateTo || filters.location || filters.status || filters.service);
}

export default function LeadExportModal({
  filters,
  onClose,
}: {
  filters: LeadExportFilters;
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

  const hasFilter = hasLeadExportFilter(filters);

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
