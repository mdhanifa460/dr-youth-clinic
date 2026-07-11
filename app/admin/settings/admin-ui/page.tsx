"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Toggle from "@/app/admin/components/Toggle";

export default function AdminUiSettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEnabled(d.data?.adminUi?.analyticsStripEnabled ?? true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(next: boolean) {
    setEnabled(next);
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUi: { analyticsStripEnabled: next } }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Save failed"); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0B2560]">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Controls for the admin panel itself — not the public website.</p>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Saved.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Toggle
            checked={enabled}
            onChange={save}
            disabled={saving}
            label="Analytics Strip"
            description="Shows a persistent Today's Leads / Bookings / Completed / Pending Leads bar at the top of every admin page for all staff, instead of only on the Dashboard."
          />
        </div>
      </div>
    </div>
  );
}
