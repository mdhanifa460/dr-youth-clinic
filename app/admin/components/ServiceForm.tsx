"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import ImageUpload from "./ImageUpload";
import SeoPreviewCard from "./SeoPreviewCard";
import KeywordSuggestions from "./KeywordSuggestions";

interface FormData {
  name: string;
  location: string;
  category: string;
  price: number;
  duration: number;
  currency: string;
  sessionsRequired: string;
  recoveryTime: string;
  technology: string;
  anaesthesia: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  narrative: string;
  heroDescription: string;
  idealFor: string[];
  benefits: Array<{ icon: string; title: string; description: string }>;
  whyChooseUs: string[];
  treatmentSteps: Array<{ title: string; description: string }>;
  recoveryStages: Array<{ phase: string; icon: string; label: string; description: string }>;
  sessionsCount: number;
  journeyPhases: Array<{ title: string; description: string }>;
  myths: Array<{ myth: string; fact: string }>;
  faq: Array<{ question: string; answer: string }>;
  heroImage: { url: string; publicId: string } | null;
  beforeAfterImages: Array<{ before: any; after: any }>;
  status: "draft" | "active" | "hidden";
}

const ICONS = ["⚡", "🛡️", "🏥", "💎", "✨", "🔬", "💪", "👨‍⚕️", "🌿", "⭐"];

const STEP_LABELS = [
  "Basic Info",
  "SEO Setup",
  "Content",
  "Journey & FAQ",
  "Benefits",
  "Publish",
];

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ServiceForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newIdealFor, setNewIdealFor] = useState("");
  const [slugCheck, setSlugCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    suggestion: string | null;
  }>({ checking: false, available: null, suggestion: null });

  const [form, setForm] = useState<FormData>(
    initialData
      ? {
          ...initialData,
          keywords: Array.isArray(initialData.keywords)
            ? initialData.keywords.join(", ")
            : initialData.keywords ?? "",
          idealFor: initialData.idealFor ?? [],
          whyChooseUs: initialData.whyChooseUs ?? [],
          treatmentSteps: initialData.treatmentSteps ?? [],
          recoveryStages: initialData.recoveryStages ?? [],
          sessionsCount: initialData.sessionsCount ?? 6,
          journeyPhases: initialData.journeyPhases ?? [],
          myths: initialData.myths ?? [],
          faq: initialData.faq ?? [],
          sessionsRequired: initialData.sessionsRequired ?? "",
          recoveryTime: initialData.recoveryTime ?? "",
          technology: initialData.technology ?? "",
          anaesthesia: initialData.anaesthesia ?? "",
          heroDescription: initialData.heroDescription ?? "",
        }
      : {
          name: "",
          location: "",
          category: "",
          price: 0,
          duration: 45,
          currency: "INR",
          sessionsRequired: "",
          recoveryTime: "",
          metaTitle: "",
          metaDescription: "",
          keywords: "",
          narrative: "",
          heroDescription: "",
          technology: "",
          anaesthesia: "",
          idealFor: [],
          whyChooseUs: [],
          benefits: [],
          treatmentSteps: [],
          recoveryStages: [],
          sessionsCount: 6,
          journeyPhases: [],
          myths: [],
          faq: [],
          heroImage: null,
          beforeAfterImages: [],
          status: "active",
        }
  );

  const updateForm = (data: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...data }));
  };

  useEffect(() => {
    if (step !== 2 || !form.name || !form.location) {
      setSlugCheck({ checking: false, available: null, suggestion: null });
      return;
    }
    const slug = toSlug(form.name);
    const excludeId = initialData?._id || "";
    const params = new URLSearchParams({ slug, location: form.location });
    if (excludeId) params.set("excludeId", excludeId);

    setSlugCheck({ checking: true, available: null, suggestion: null });
    fetch(`/api/admin/services/check-slug?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSlugCheck({
            checking: false,
            available: d.available,
            suggestion: d.suggestion ?? null,
          });
        }
      })
      .catch(() => setSlugCheck({ checking: false, available: null, suggestion: null }));
  }, [step, form.name, form.location]);

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!form.name.trim()) { setError("Service name is required"); return false; }
        if (!form.location) { setError("Location is required"); return false; }
        if (!form.category) { setError("Category is required"); return false; }
        break;
      case 2:
        if (!form.metaTitle.trim()) { setError("Meta title is required"); return false; }
        if (form.metaTitle.length > 60) { setError("Meta title should be max 60 characters"); return false; }
        if (!form.metaDescription.trim()) { setError("Meta description is required"); return false; }
        if (form.metaDescription.length > 160) { setError("Meta description should be max 160 characters"); return false; }
        break;
      case 3:
        if (!form.narrative.trim()) { setError("Treatment narrative is required"); return false; }
        if (!form.heroImage) { setError("Hero image is required"); return false; }
        break;
      case 5:
        if (form.benefits.length === 0) { setError("Add at least one benefit"); return false; }
        if (!form.price || form.price <= 0) { setError("Price is required"); return false; }
        break;
    }
    setError("");
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const url = initialData
        ? `/api/admin/services/${initialData._id}`
        : "/api/admin/services";
      const method = initialData ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!data.success) { setError(data.message || "Failed to save service"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/admin/services"), 3200);
    } catch (err: any) {
      setError(err.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  const addIdealForTag = () => {
    const val = newIdealFor.trim();
    if (val && !form.idealFor.includes(val)) {
      updateForm({ idealFor: [...form.idealFor, val] });
    }
    setNewIdealFor("");
  };

  // ── Animated success screen ──
  if (success) {
    const isActive = form.status === "active";
    const slug = toSlug(form.name);
    const city = form.location;

    return (
      <>
        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(550px) rotate(720deg); opacity: 0; }
          }
          @keyframes scale-in {
            0%   { transform: scale(0); opacity: 0; }
            60%  { transform: scale(1.08); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes draw-circle {
            0%   { stroke-dashoffset: 283; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes draw-check {
            0%   { stroke-dashoffset: 80; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes fill-progress {
            0%   { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes fade-up {
            0%   { opacity: 0; transform: translateY(14px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .anim-circle  { animation: draw-circle 0.6s ease-out 0.2s both; }
          .anim-check   { animation: draw-check 0.4s ease-out 0.7s both; }
          .anim-icon    { animation: scale-in 0.5s ease-out 0.1s both; }
          .anim-text    { animation: fade-up 0.5s ease-out 0.9s both; }
          .anim-badge   { animation: fade-up 0.4s ease-out 1.1s both; }
          .anim-sub     { animation: fade-up 0.4s ease-out 1.3s both; }
          .anim-bar     { animation: fill-progress 3.2s linear 1.0s both; }
          .anim-btn     { animation: fade-up 0.4s ease-out 1.5s both; }
          .confetti-particle { animation: confetti-fall linear both; }
        `}</style>

        <div className="relative bg-white min-h-[480px] rounded-2xl flex flex-col items-center justify-center px-6 py-12 overflow-hidden text-center">
          {[...Array(22)].map((_, i) => {
            const colors = ["#0B2560", "#F5A623", "#4CAF50", "#E91E63", "#9C27B0", "#2196F3"];
            const shapes = ["rounded-full", "rounded-sm", "rounded"];
            return (
              <div
                key={i}
                className={`absolute confetti-particle ${shapes[i % shapes.length]}`}
                style={{
                  left: `${5 + (i * 4.3) % 90}%`,
                  top: "-12px",
                  width: i % 3 === 0 ? "10px" : "7px",
                  height: i % 3 === 0 ? "10px" : "7px",
                  backgroundColor: colors[i % colors.length],
                  animationDuration: `${1.4 + (i % 5) * 0.22}s`,
                  animationDelay: `${(i % 7) * 0.08}s`,
                }}
              />
            );
          })}

          <div className="anim-icon mb-5">
            <svg width="96" height="96" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke={isActive ? "#22c55e" : "#3b82f6"} strokeWidth="5" fill="none" strokeDasharray="283" className="anim-circle" />
              <path d="M28 50 L44 66 L72 34" stroke={isActive ? "#22c55e" : "#3b82f6"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="80" className="anim-check" />
            </svg>
          </div>

          <h2 className="anim-text text-2xl font-bold text-gray-900 mb-1">
            {isActive ? "🎉 Service Published!" : "✅ Service Saved!"}
          </h2>
          <p className="anim-text text-gray-700 font-medium mb-3">{form.name}</p>
          <span className={`anim-badge inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 ${isActive ? "bg-green-100 text-green-700" : form.status === "draft" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
            {form.status.toUpperCase()}
          </span>
          <p className="anim-sub text-sm text-gray-500 mb-1">
            {isActive ? "Your service is now live and visible to patients." : `Saved as ${form.status}.`}
          </p>
          {isActive && slug && city && (
            <p className="anim-sub text-xs text-gray-400 mb-4 font-mono">
              /{city}/services/{form.category?.toLowerCase() || "category"}/{slug}
            </p>
          )}
          <div className="w-full max-w-xs bg-gray-100 rounded-full h-1 mb-2 overflow-hidden mt-4">
            <div className={`anim-bar h-1 rounded-full ${isActive ? "bg-green-500" : "bg-blue-500"}`} style={{ width: "0%" }} />
          </div>
          <p className="text-xs text-gray-400 mb-5">Redirecting to services dashboard…</p>
          <button className="anim-btn bg-[#0B2560] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-900 transition" onClick={() => router.push("/admin/services")}>
            Go to Services Dashboard →
          </button>
        </div>
      </>
    );
  }

  const computedSlug = form.name ? toSlug(form.name) : "";
  const TOTAL_STEPS = 6;

  return (
    <div className="max-w-4xl mx-auto">
      {/* PROGRESS BAR */}
      <div className="mb-8">
        <div className="flex justify-between mb-3">
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${step >= s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {s}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${step === s ? "text-blue-600" : "text-gray-400"}`}>{label}</span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-gray-100 h-1 rounded-full">
          <div className="bg-blue-600 h-1 rounded-full transition-all" style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }} />
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 flex gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* ── STEP 1: BASIC INFO ── */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">Basic Information</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="e.g., Advanced Dermal Fillers"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
              <select value={form.location} onChange={(e) => updateForm({ location: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Location</option>
                <option value="chennai">Chennai</option>
                <option value="bangalore">Bangalore</option>
                <option value="coimbatore">Coimbatore</option>
                <option value="kochi">Kochi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
              <select value={form.category} onChange={(e) => updateForm({ category: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Category</option>
                <option value="Skin">Skin</option>
                <option value="Hair">Hair</option>
                <option value="Laser">Laser</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹) *</label>
              <input type="number" value={form.price} onChange={(e) => updateForm({ price: Number(e.target.value) })} placeholder="0" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (mins) *</label>
              <input type="number" value={form.duration} onChange={(e) => updateForm({ duration: Number(e.target.value) })} min="5" max="480" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
              <select value={form.currency} onChange={(e) => updateForm({ currency: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Sessions Required</label>
              <input type="text" value={form.sessionsRequired} onChange={(e) => updateForm({ sessionsRequired: e.target.value })} placeholder="e.g., 3–6 sessions" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Shown on service page as a trust badge</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Recovery / Downtime</label>
              <input type="text" value={form.recoveryTime} onChange={(e) => updateForm({ recoveryTime: e.target.value })} placeholder="e.g., Zero downtime" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Highly conversion-relevant for busy patients</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Anaesthesia</label>
              <input type="text" value={form.anaesthesia} onChange={(e) => updateForm({ anaesthesia: e.target.value })} placeholder="e.g., Topical / None" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Shown in the "Treatment at a Glance" card — leave blank to default to "Topical / None"</p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: SEO SETUP ── */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">SEO Setup</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meta Title * <span className="text-gray-400 font-normal">{form.metaTitle.length}/60</span>
            </label>
            <input type="text" value={form.metaTitle} onChange={(e) => updateForm({ metaTitle: e.target.value })} placeholder="e.g., Advanced Dermal Fillers in Chennai | DR Youth Clinic" maxLength={60} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Keep it concise · Include service + city</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meta Description * <span className="text-gray-400 font-normal">{form.metaDescription.length}/160</span>
            </label>
            <textarea value={form.metaDescription} onChange={(e) => updateForm({ metaDescription: e.target.value })} placeholder="Describe what users will see in Google search results…" maxLength={160} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <p className="text-xs text-gray-400 mt-1">Only appears in Google search results — not shown on the page itself. Use Hero Description (Step 3) for the on-page pitch.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Focus Keywords <span className="text-gray-400 font-normal">(comma-separated)</span>
              </label>
              <input type="text" value={form.keywords} onChange={(e) => updateForm({ keywords: e.target.value })} placeholder="e.g., dermal fillers, lip augmentation, anti-aging" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <KeywordSuggestions
              serviceName={form.name}
              category={form.category}
              location={form.location}
              keywords={form.keywords}
              onChange={(v) => updateForm({ keywords: v })}
            />
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">URL Slug (auto-generated)</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-mono">dryouthclinic.com/{form.location || "city"}/services/{form.category?.toLowerCase() || "category"}/</span>
              <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{computedSlug || "service-name"}</span>
              {slugCheck.checking && <span className="text-xs text-gray-400">checking…</span>}
              {!slugCheck.checking && slugCheck.available === true && <span className="text-xs text-green-600 font-semibold">✓ Available</span>}
              {!slugCheck.checking && slugCheck.available === false && (
                <span className="text-xs text-red-500 font-semibold">
                  ✗ Taken {slugCheck.suggestion && <span className="text-gray-500 font-normal ml-1">→ suggest: <span className="font-mono">{slugCheck.suggestion}</span></span>}
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Live Preview</p>
            <SeoPreviewCard title={form.metaTitle} description={form.metaDescription} keywords={form.keywords} slug={computedSlug} location={form.location} serviceName={form.name} benefits={form.benefits} narrative={form.narrative} />
          </div>
        </div>
      )}

      {/* ── STEP 3: CONTENT & MEDIA ── */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
          <h2 className="text-2xl font-bold text-[#0B2560]">Content & Media</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hero Description <span className="text-gray-400 font-normal">{form.heroDescription.length}/220</span>
            </label>
            <textarea value={form.heroDescription} onChange={(e) => updateForm({ heroDescription: e.target.value })} placeholder="A short, compelling pitch shown prominently at the top of the page — write for patients, not search engines." maxLength={220} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm leading-relaxed" />
            <p className="text-xs text-gray-400 mt-1">Shown directly under the page title. Leave blank to fall back to the start of the Treatment Narrative below.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Treatment Narrative * <span className="text-gray-400 font-normal">{form.narrative.length}/5000</span>
            </label>
            <textarea value={form.narrative} onChange={(e) => updateForm({ narrative: e.target.value })} placeholder="Describe the treatment in detail — what it is, how it works, expected outcomes, who it's for. More detail = better SEO." rows={8} maxLength={5000} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed" />
            <p className="text-xs text-gray-400 mt-1">Rich content here directly improves Google ranking for this treatment page.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Image *</label>
            <ImageUpload onUpload={(data) => updateForm({ heroImage: data })} label="Service Hero Image (1200×800px recommended)" folder={`dr-youth-clinic/services/${form.location || "general"}`} />
          </div>

          {/* Technology */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Technology / What Powers This Treatment</label>
            <textarea value={form.technology} onChange={(e) => updateForm({ technology: e.target.value })} placeholder="e.g., FDA-cleared Nd:YAG 1064nm laser with integrated cooling — targets melanin without damaging surrounding tissue…" rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed" />
            <p className="text-xs text-gray-400 mt-1">Shown as a dedicated "Technology" section on the service page — builds credibility.</p>
          </div>

          {/* Ideal For */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Ideal For</label>
            <p className="text-xs text-gray-400 mb-3">Who should consider this treatment? Add as tags (e.g., Pigmentation, Acne Scars, Dark Spots)</p>
            {form.idealFor.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.idealFor.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-medium">
                    {tag}
                    <button onClick={() => updateForm({ idealFor: form.idealFor.filter((_, j) => j !== i) })} className="text-blue-400 hover:text-red-500 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newIdealFor}
                onChange={(e) => setNewIdealFor(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIdealForTag(); } }}
                placeholder="Type a condition and press Enter…"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={addIdealForTag} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: TREATMENT JOURNEY & FAQ ── */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-10">
          <div>
            <h2 className="text-2xl font-bold text-[#0B2560]">Treatment Journey & FAQ</h2>
            <p className="text-sm text-gray-500 mt-1">These sections are the #1 patient questions — filling them converts browsers into bookers and boosts Google ranking.</p>
          </div>

          {/* Treatment Steps */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-semibold text-gray-800">Treatment Journey Steps</label>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{form.treatmentSteps.length} steps</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Walk the patient through what they'll experience — Consultation → Treatment → Recovery → Results</p>

            <div className="space-y-3">
              {form.treatmentSteps.map((ts, idx) => (
                <div key={idx} className="flex gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-[#0B2560] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={ts.title}
                      onChange={(e) => {
                        const updated = [...form.treatmentSteps];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        updateForm({ treatmentSteps: updated });
                      }}
                      placeholder="Step title (e.g., Consultation, Treatment, Recovery)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={ts.description}
                      onChange={(e) => {
                        const updated = [...form.treatmentSteps];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        updateForm({ treatmentSteps: updated });
                      }}
                      placeholder="What happens at this stage — be specific and reassuring…"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button onClick={() => updateForm({ treatmentSteps: form.treatmentSteps.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition mt-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ treatmentSteps: [...form.treatmentSteps, { title: "", description: "" }] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Step
            </button>
          </div>

          {/* Recovery Timeline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-semibold text-gray-800">Recovery Timeline</label>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{form.recoveryStages.length} stages</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Shown as a 4-card grid under "Recovery Timeline". Leave empty to use the generic default (Day 1 / Days 2–3 / Week 1 / Month 1+).</p>

            <div className="space-y-3">
              {form.recoveryStages.map((stage, idx) => (
                <div key={idx} className="p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={stage.phase}
                      onChange={(e) => { const updated = [...form.recoveryStages]; updated[idx] = { ...updated[idx], phase: e.target.value }; updateForm({ recoveryStages: updated }); }}
                      placeholder="Phase (e.g., Day 1)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      value={stage.icon}
                      onChange={(e) => { const updated = [...form.recoveryStages]; updated[idx] = { ...updated[idx], icon: e.target.value }; updateForm({ recoveryStages: updated }); }}
                      placeholder="Icon (e.g., 🛌)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      value={stage.label}
                      onChange={(e) => { const updated = [...form.recoveryStages]; updated[idx] = { ...updated[idx], label: e.target.value }; updateForm({ recoveryStages: updated }); }}
                      placeholder="Label (e.g., Immediate)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={stage.description}
                      onChange={(e) => { const updated = [...form.recoveryStages]; updated[idx] = { ...updated[idx], description: e.target.value }; updateForm({ recoveryStages: updated }); }}
                      placeholder="What to expect at this stage…"
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => updateForm({ recoveryStages: form.recoveryStages.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition self-start mt-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ recoveryStages: [...form.recoveryStages, { phase: "", icon: "", label: "", description: "" }] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-green-200 text-green-600 rounded-xl hover:bg-green-50 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Recovery Stage
            </button>
          </div>

          {/* Phase-Based Multi-Session Journey */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-semibold text-gray-800">Multi-Session Journey (Phase 1–4)</label>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{form.journeyPhases.length}/4 phases set</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              A separate "Phase 1–4" timeline further down the page for multi-session treatments. Session ranges are calculated automatically from Total Sessions below. Each phase you fill in overrides that slot's generic title/description — leave any phase blank (or all of them) to use the default for just that slot.
            </p>

            <div className="mb-4 max-w-[180px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Total Sessions</label>
              <input
                type="number" min={1} max={30}
                value={form.sessionsCount}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateForm({ sessionsCount: raw === "" ? 1 : Math.min(30, Math.max(1, Number(raw))) });
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3">
              {form.journeyPhases.map((phase, idx) => (
                <div key={idx} className="flex gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-[#F5A623] text-[#0B2560] text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={phase.title}
                      onChange={(e) => { const updated = [...form.journeyPhases]; updated[idx] = { ...updated[idx], title: e.target.value }; updateForm({ journeyPhases: updated }); }}
                      placeholder="Phase title (e.g., Initial Assessment)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={phase.description}
                      onChange={(e) => { const updated = [...form.journeyPhases]; updated[idx] = { ...updated[idx], description: e.target.value }; updateForm({ journeyPhases: updated }); }}
                      placeholder="What happens in this phase…"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button onClick={() => updateForm({ journeyPhases: form.journeyPhases.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition mt-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ journeyPhases: [...form.journeyPhases, { title: "", description: "" }] })}
              disabled={form.journeyPhases.length >= 4}
              className="mt-3 w-full py-3 border-2 border-dashed border-[#F5A623]/50 text-[#c47f10] rounded-xl hover:bg-[#F5A623]/5 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={15} /> Add Phase {form.journeyPhases.length >= 4 ? "(max 4)" : ""}
            </button>
          </div>

          {/* Myths vs Facts */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-semibold text-gray-800">Myths vs. Facts</label>
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg font-medium">🔥 High engagement</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Patients often have misconceptions — clear them here. This section dramatically increases time-on-page and trust.</p>

            <div className="space-y-3">
              {form.myths.map((item, idx) => (
                <div key={idx} className="p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        value={item.myth}
                        onChange={(e) => {
                          const updated = [...form.myths];
                          updated[idx] = { ...updated[idx], myth: e.target.value };
                          updateForm({ myths: updated });
                        }}
                        placeholder='Myth: e.g., "Laser treatments are painful and risky"'
                        className="w-full px-3 py-2 border border-red-100 bg-red-50/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      <input
                        value={item.fact}
                        onChange={(e) => {
                          const updated = [...form.myths];
                          updated[idx] = { ...updated[idx], fact: e.target.value };
                          updateForm({ myths: updated });
                        }}
                        placeholder='Fact: e.g., "Our laser uses integrated cooling — most patients describe it as mild warmth"'
                        className="w-full px-3 py-2 border border-green-100 bg-green-50/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                      />
                    </div>
                    <button onClick={() => updateForm({ myths: form.myths.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition self-start mt-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ myths: [...form.myths, { myth: "", fact: "" }] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Myth vs. Fact
            </button>
          </div>

          {/* FAQ */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-semibold text-gray-800">Frequently Asked Questions</label>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg font-medium">⚡ Boosts Google ranking</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">These appear in Google's "People Also Ask" section and as rich result stars. Add 4–8 questions.</p>

            <div className="space-y-3">
              {form.faq.map((item, idx) => (
                <div key={idx} className="p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={item.question}
                      onChange={(e) => {
                        const updated = [...form.faq];
                        updated[idx] = { ...updated[idx], question: e.target.value };
                        updateForm({ faq: updated });
                      }}
                      placeholder="Question (e.g., How many sessions are required?)"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => updateForm({ faq: form.faq.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea
                    value={item.answer}
                    onChange={(e) => {
                      const updated = [...form.faq];
                      updated[idx] = { ...updated[idx], answer: e.target.value };
                      updateForm({ faq: updated });
                    }}
                    placeholder="Answer — write clearly for patients, not medical jargon…"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ faq: [...form.faq, { question: "", answer: "" }] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-50 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add FAQ
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: BENEFITS & BEFORE/AFTER ── */}
      {step === 5 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-10">
          <h2 className="text-2xl font-bold text-[#0B2560]">Benefits & Results Gallery</h2>

          {/* Benefits */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-base font-semibold text-gray-800">Why Choose This Treatment? *</label>
              {form.benefits.length > 0 && <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">{form.benefits.length} added</span>}
            </div>

            <div className="space-y-3">
              {form.benefits.map((benefit, idx) => (
                <div key={idx} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                  <div className="flex gap-2 mb-3">
                    <select
                      value={benefit.icon}
                      onChange={(e) => {
                        const updated = [...form.benefits];
                        updated[idx] = { ...updated[idx], icon: e.target.value };
                        updateForm({ benefits: updated });
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-lg"
                    >
                      {ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                    </select>
                    <input
                      type="text"
                      value={benefit.title}
                      onChange={(e) => {
                        const updated = [...form.benefits];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        updateForm({ benefits: updated });
                      }}
                      placeholder="Benefit title"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => updateForm({ benefits: form.benefits.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea
                    value={benefit.description}
                    onChange={(e) => {
                      const updated = [...form.benefits];
                      updated[idx] = { ...updated[idx], description: e.target.value };
                      updateForm({ benefits: updated });
                    }}
                    placeholder="Benefit description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ benefits: [...form.benefits, { icon: "✨", title: "", description: "" }] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Benefit
            </button>
          </div>

          {/* Why Choose DR Youth Clinic (per-service trust points) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-semibold text-gray-800">Why Choose DR Youth Clinic?</label>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{form.whyChooseUs.length} points</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Clinic trust points shown near the bottom of this service's page. Leave empty to use the default clinic-wide points.</p>

            <div className="space-y-3">
              {form.whyChooseUs.map((point, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={point}
                    onChange={(e) => {
                      const updated = [...form.whyChooseUs];
                      updated[idx] = e.target.value;
                      updateForm({ whyChooseUs: updated });
                    }}
                    placeholder="e.g., FDA-approved technology and evidence-based protocols"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={() => updateForm({ whyChooseUs: form.whyChooseUs.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ whyChooseUs: [...form.whyChooseUs, ""] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Trust Point
            </button>
          </div>

          {/* Before / After Image Pairs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-semibold text-gray-800">Before & After Gallery</label>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{form.beforeAfterImages.length} pairs</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Upload real patient result pairs — shown on the service page as proof of results.</p>

            <div className="space-y-5">
              {form.beforeAfterImages.map((pair, idx) => (
                <div key={idx} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">Result Pair {idx + 1}</span>
                    <button onClick={() => updateForm({ beforeAfterImages: form.beforeAfterImages.filter((_, i) => i !== idx) })} className="text-gray-300 hover:text-red-400 transition flex items-center gap-1 text-xs">
                      <Trash2 size={13} /> Remove pair
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Before</p>
                      {pair.before?.url ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                          <img src={pair.before.url} alt="Before" className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              const updated = [...form.beforeAfterImages];
                              updated[idx] = { ...updated[idx], before: null };
                              updateForm({ beforeAfterImages: updated });
                            }}
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500 transition"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <ImageUpload
                          onUpload={(data) => {
                            const updated = [...form.beforeAfterImages];
                            updated[idx] = { ...updated[idx], before: data };
                            updateForm({ beforeAfterImages: updated });
                          }}
                          label="Upload Before"
                          folder={`dr-youth-clinic/services/${form.location || "general"}/before-after`}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">After</p>
                      {pair.after?.url ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                          <img src={pair.after.url} alt="After" className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              const updated = [...form.beforeAfterImages];
                              updated[idx] = { ...updated[idx], after: null };
                              updateForm({ beforeAfterImages: updated });
                            }}
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500 transition"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <ImageUpload
                          onUpload={(data) => {
                            const updated = [...form.beforeAfterImages];
                            updated[idx] = { ...updated[idx], after: data };
                            updateForm({ beforeAfterImages: updated });
                          }}
                          label="Upload After"
                          folder={`dr-youth-clinic/services/${form.location || "general"}/before-after`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => updateForm({ beforeAfterImages: [...form.beforeAfterImages, { before: null, after: null }] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-purple-200 text-purple-600 rounded-xl hover:bg-purple-50 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Before &amp; After Pair
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: PUBLISH ── */}
      {step === 6 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-2xl font-bold text-[#0B2560]">Review & Publish</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Service Status</label>
            <div className="grid grid-cols-3 gap-3">
              {(["draft", "active", "hidden"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => updateForm({ status })}
                  className={`p-4 rounded-xl border-2 transition text-left ${form.status === status ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <div className="font-semibold capitalize text-sm">{status}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {status === "draft" && "Only for admins"}
                    {status === "active" && "Public & bookable ✓"}
                    {status === "hidden" && "Hidden from public"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#f6faff] p-5 rounded-xl border border-blue-50 space-y-3">
            <h3 className="font-bold text-[#0B2560] text-sm">Service Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">Name:</span> <span className="font-semibold">{form.name}</span></p>
              <p><span className="text-gray-500">Location:</span> <span className="font-semibold capitalize">{form.location}</span></p>
              <p><span className="text-gray-500">Price:</span> <span className="font-semibold">{form.currency} {form.price}</span></p>
              <p><span className="text-gray-500">Duration:</span> <span className="font-semibold">{form.duration} mins</span></p>
              {form.sessionsRequired && <p><span className="text-gray-500">Sessions:</span> <span className="font-semibold">{form.sessionsRequired}</span></p>}
              {form.recoveryTime && <p><span className="text-gray-500">Recovery:</span> <span className="font-semibold">{form.recoveryTime}</span></p>}
              <p><span className="text-gray-500">FAQ:</span> <span className="font-semibold">{form.faq.length} Q&amp;As</span></p>
              <p><span className="text-gray-500">Journey:</span> <span className="font-semibold">{form.treatmentSteps.length} steps</span></p>
            </div>
            {computedSlug && (
              <p className="text-xs text-gray-400 font-mono pt-1 border-t border-blue-50">
                URL: /{form.location}/services/{form.category?.toLowerCase() || "category"}/{computedSlug}
              </p>
            )}
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <div className="flex gap-4 mt-8">
        {step > 1 && (
          <button onClick={() => { setError(""); setStep(step - 1); }} className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium">
            ← Previous
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => { if (validateStep(step)) { setError(""); setStep(step + 1); } }}
            className="ml-auto px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="ml-auto px-8 py-3 bg-[#0B2560] text-white rounded-xl hover:bg-blue-900 transition text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Publishing…" : "Publish Service"}
          </button>
        )}
      </div>
    </div>
  );
}
