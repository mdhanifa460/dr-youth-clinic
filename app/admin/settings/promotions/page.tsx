"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type PromotionsSettings = {
  referralEnabled: boolean;
  referralReward: number;
  promoCode: string;
  promoDiscount: number;
  birthdayCampaign: boolean;
  birthdayDiscount: number;
};

const DEFAULTS: PromotionsSettings = {
  referralEnabled: false,
  referralReward: 500,
  promoCode: "",
  promoDiscount: 10,
  birthdayCampaign: false,
  birthdayDiscount: 20,
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${on ? "bg-[#0B2560]" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}>
      <span className="inline-block bg-white rounded-full shadow transition-transform"
        style={{ width: 18, height: 18, transform: on ? "translateX(22px)" : "translateX(3px)" }} />
    </button>
  );
}

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
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promotions: form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.message || "Save failed"); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
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
            <p className="text-gray-400 text-sm mt-0.5">Manage referrals, promo codes, and birthday campaigns.</p>
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

        {/* Patient Referral Programme */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Patient Referral Programme</h2>
              <p className="text-gray-400 text-xs mt-0.5">Reward existing patients for bringing in new patients.</p>
            </div>
            <Toggle on={form.referralEnabled} onChange={() => set("referralEnabled", !form.referralEnabled)} />
          </div>

          <div className="px-6 py-5">
            {form.referralEnabled ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reward Amount</label>
                  <div className="flex items-center gap-0">
                    <span className="inline-flex items-center px-3 py-2.5 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={form.referralReward}
                      onChange={(e) => set("referralReward", +e.target.value)}
                      className="w-full border border-gray-200 rounded-r-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]"
                      placeholder="500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  Existing patients get this credit when they refer a friend who completes a treatment.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-5 py-4">
                <span className="text-2xl">🎁</span>
                <p className="text-sm text-gray-400">Enable to reward patients for bringing new patients.</p>
              </div>
            )}
          </div>
        </div>

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

        {/* Birthday Campaign */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2560] text-sm">Birthday Campaign</h2>
              <p className="text-gray-400 text-xs mt-0.5">Send patients a birthday discount via WhatsApp.</p>
            </div>
            <Toggle on={form.birthdayCampaign} onChange={() => set("birthdayCampaign", !form.birthdayCampaign)} />
          </div>

          <div className="px-6 py-5">
            {form.birthdayCampaign ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Birthday Discount</label>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {[10, 15, 20, 25].map((d) => (
                      <button key={d} type="button"
                        onClick={() => set("birthdayDiscount", d)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                          form.birthdayDiscount === d
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
                      value={form.birthdayDiscount}
                      onChange={(e) => set("birthdayDiscount", +e.target.value)}
                      className="w-24 border border-gray-200 rounded-l-xl px-4 py-2.5 text-sm text-center focus:outline-none focus:border-[#0B2560]"
                    />
                    <span className="inline-flex items-center px-3 py-2.5 text-sm text-gray-500 bg-gray-50 border border-l-0 border-gray-200 rounded-r-xl">
                      %
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  Patients receive a birthday WhatsApp message with this discount 3 days before their birthday. Requires date of birth collection in booking settings.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Message Preview</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 select-none cursor-default leading-relaxed">
                    🎂 Happy Birthday {"{{"} name {"}}"}! Treat yourself — enjoy{" "}
                    <span className="font-semibold text-[#0B2560]">{form.birthdayDiscount}%</span> off your next visit at DR Youth Clinic. Valid for 7 days. Reply <span className="font-mono">BIRTHDAY</span> to redeem.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-5 py-4">
                <span className="text-2xl">🎂</span>
                <p className="text-sm text-gray-400">Enable to send patients a birthday WhatsApp message with a special discount.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
