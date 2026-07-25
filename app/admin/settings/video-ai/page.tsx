"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

type VideoAiSettings = {
  generateSeoEnabled: boolean;
  generateSummaryEnabled: boolean;
  generateFaqEnabled: boolean;
  generateBlogEnabled: boolean;
  generateStoryEnabled: boolean;
};

const DEFAULTS: VideoAiSettings = {
  generateSeoEnabled: true,
  generateSummaryEnabled: true,
  generateFaqEnabled: false,
  generateBlogEnabled: false,
  generateStoryEnabled: false,
};

const TOGGLES: { key: keyof VideoAiSettings; label: string; desc: string }[] = [
  {
    key: "generateSeoEnabled",
    label: "Generate SEO",
    desc: "AI-suggested meta title, description, and keywords for a video — same tool already used for Blog and Web Stories.",
  },
  {
    key: "generateSummaryEnabled",
    label: "Generate Summary & Key Takeaways",
    desc: "A short AI summary and bullet-point takeaways from the video's title, category, and any transcript/chapters entered.",
  },
  {
    key: "generateFaqEnabled",
    label: "Generate FAQ",
    desc: "AI-drafted question/answer pairs appended to the video's FAQ list for admin review before saving.",
  },
  {
    key: "generateBlogEnabled",
    label: "Generate Blog Draft",
    desc: "Creates a new draft Blog post from this video's content — opens in the normal Blog editor, unpublished until you publish it.",
  },
  {
    key: "generateStoryEnabled",
    label: "Generate Web Story Draft",
    desc: "Creates a new draft Web Story from this video's content — opens in the normal Story builder, unpublished until you publish it.",
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${on ? "bg-[#0B2560]" : "bg-gray-200"}`}
      style={{ width: 44, height: 24 }}
    >
      <span
        className="inline-block bg-white rounded-full shadow transition-transform"
        style={{ width: 18, height: 18, transform: on ? "translateX(22px)" : "translateX(3px)" }}
      />
    </button>
  );
}

export default function VideoAiSettingsPage() {
  const [form, setForm] = useState<VideoAiSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.videoAI) setForm({ ...DEFAULTS, ...d.data.videoAI });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof VideoAiSettings>(key: K, val: VideoAiSettings[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoAI: form }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">Video AI</h1>
            <p className="text-gray-400 text-sm mt-0.5">Turn on-demand AI generation on or off for the Video module — nothing here ever runs automatically, this only controls whether the "Generate" buttons are usable.</p>
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

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {TOGGLES.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <Toggle on={form[key]} onChange={() => set(key, !form[key])} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-3.5 rounded-xl">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-blue-400" />
          <p>Extracting Video ID, thumbnail, title, and channel name when a URL is pasted is always free and always on — it uses YouTube's public oEmbed lookup, not a paid API, so there's no setting to control it.</p>
        </div>

      </div>
    </div>
  );
}
