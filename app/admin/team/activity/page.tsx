"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ActivityEntry = {
  _id: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  method: string;
  path: string;
  query: string;
  details?: string;
  outcome: "allowed" | "denied" | "failed_login";
  ipAddress: string;
  createdAt: string;
};

const VERBS: Record<string, string> = { POST: "Create / run", PUT: "Update", PATCH: "Update", DELETE: "Delete" };

const OUTCOME_STYLES: Record<ActivityEntry["outcome"], { label: string; className: string }> = {
  allowed: { label: "Allowed", className: "bg-green-100 text-green-700" },
  denied: { label: "Blocked", className: "bg-red-100 text-red-700" },
  failed_login: { label: "Failed", className: "bg-amber-100 text-amber-700" },
};

function describe(e: ActivityEntry) {
  if (e.path === "/api/admin/login") return "Log in";
  if (e.path === "/api/admin/login/verify") return "Log in with two-step code";
  const target = e.path.replace(/^\/api\/admin\//, "");
  return `${VERBS[e.method] ?? e.method}: ${target}${e.query}`;
}

export default function TeamActivityPage() {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (email) params.set("email", email);
    fetch(`/api/admin/team/activity?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { setError(d.message || "Failed to load activity"); return; }
        setLogs(d.data);
        setPeople(d.people);
        setTotalPages(d.totalPages);
      })
      .catch(() => setError("Failed to load activity"))
      .finally(() => setLoading(false));
  }, [email, page]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Logins and changes made in the admin panel. &quot;Allowed&quot; means the person had permission to try it.
          </p>
        </div>
        <Link href="/admin/team" className="text-sm text-blue-600 hover:underline">← Back to Team</Link>
      </div>

      <select
        aria-label="Filter by person"
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setPage(1); }}
      >
        <option value="">Everyone</option>
        {people.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">When (IST)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Person</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Result</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((e) => (
                <tr key={e._id}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{e.actorName || e.actorEmail}</div>
                    {e.actorName && <div className="text-xs text-gray-500">{e.actorEmail}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 break-all">
                    {describe(e)}
                    {e.details && <div className="text-xs text-gray-500 mt-0.5">{e.details}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OUTCOME_STYLES[e.outcome].className}`}>
                      {OUTCOME_STYLES[e.outcome].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.ipAddress}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No activity recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={page <= 1 || loading}
          className="border rounded-lg px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Newer
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages || loading}
          className="border rounded-lg px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Older
        </button>
      </div>
    </div>
  );
}
