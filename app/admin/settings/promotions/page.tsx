"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type PromotionsSettings = {
  promoCode: string;
  promoDiscount: number;
};

const DEFAULTS: PromotionsSettings = {
  promoCode: "",
  promoDiscount: 10,
};

export default function PromotionsSettingsPage() {
  const [form, setForm] = useState<PromotionsSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.promotions) setForm({ ...DEFAULTS, ...d.data.promotions });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof PromotionsSettings>(key: K, val: PromotionsSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotions: form }),
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

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Promotions</h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage the active promo code shown on the booking form.</p>
          </div>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Settings saved
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Promo Code */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-[#0B2560] text-sm">Promo Code</h2>
            <p className="text-gray-400 text-xs mt-0.5">One active code at a time — applied at the booking form for a percentage discount.</p>
          </div>
          <div className="px-6 py-5 space-y-5">

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Active Promo Code</label>
              <input
                type="text"
                value={form.promoCode}
                onChange={(e) => set("promoCode", e.target.value.toUpperCase())}
                placeholder="e.g. GLOW20"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] font-mono uppercase tracking-widest"
              />
              {!form.promoCode && (
                <p className="text-xs text-gray-300 mt-1.5 italic">No active promo code set.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount Percentage</label>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {[5, 10, 15, 20, 25, 30].map((d) => (
                  <button key={d} type="button"
                    onClick={() => set("promoDiscount", d)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      form.promoDiscount === d
                        ? "bg-[#0B2560] text-white border-[#0B2560]"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}>{d}%</button>
                ))}
              </div>
              <div className="flex items-center gap-0">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.promoDiscount}
                  onChange={(e) => set("promoDiscount", +e.target.value)}
                  className="w-24 border border-gray-200 rounded-l-xl px-4 py-2.5 text-sm text-center focus:outline-none focus:border-[#0B2560]"
                />
                <span className="inline-flex items-center px-3 py-2.5 text-sm text-gray-500 bg-gray-50 border border-l-0 border-gray-200 rounded-r-xl">
                  %
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              The promo code can be entered on the booking form for a percentage discount.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
