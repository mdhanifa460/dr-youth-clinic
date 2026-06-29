"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
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
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  narrative: string;
  benefits: Array<{ icon: string; title: string; description: string }>;
  heroImage: { url: string; publicId: string } | null;
  beforeAfterImages: Array<{ before: any; after: any }>;
  status: "draft" | "active" | "hidden";
}

const ICONS = ["⚡", "🛡️", "🏥", "💎", "✨", "🔬", "💪", "👨‍⚕️"];

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
        }
      : {
          name: "",
          location: "",
          category: "",
          price: 0,
          duration: 45,
          currency: "INR",
          metaTitle: "",
          metaDescription: "",
          keywords: "",
          narrative: "",
          benefits: [],
          heroImage: null,
          beforeAfterImages: [],
          status: "active",
        }
  );

  const updateForm = (data: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...data }));
  };

  // Check slug availability when entering step 2
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
      case 4:
        if (form.benefits.length === 0) { setError("Add at least one benefit"); return false; }
        if (!form.price || form.price <= 0) { setError("Price is required"); return false; }
        break;
    }
    setError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
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
          {/* Confetti */}
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

          {/* Animated SVG checkmark */}
          <div className="anim-icon mb-5">
            <svg width="96" height="96" viewBox="0 0 100 100" fill="none">
              <circle
                cx="50" cy="50" r="45"
                stroke={isActive ? "#22c55e" : "#3b82f6"}
                strokeWidth="5"
                fill="none"
                strokeDasharray="283"
                className="anim-circle"
              />
              <path
                d="M28 50 L44 66 L72 34"
                stroke={isActive ? "#22c55e" : "#3b82f6"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray="80"
                className="anim-check"
              />
            </svg>
          </div>

          <h2 className="anim-text text-2xl font-bold text-gray-900 mb-1">
            {isActive ? "🎉 Service Published!" : "✅ Service Saved!"}
          </h2>

          <p className="anim-text text-gray-700 font-medium mb-3">{form.name}</p>

          <span
            className={`anim-badge inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 ${
              isActive
                ? "bg-green-100 text-green-700"
                : form.status === "draft"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {form.status.toUpperCase()}
          </span>

          <p className="anim-sub text-sm text-gray-500 mb-1">
            {isActive
              ? "Your service is now live and visible to patients."
              : `Saved as ${form.status}. You can publish it from the services dashboard.`}
          </p>

          {isActive && slug && city && (
            <p className="anim-sub text-xs text-gray-400 mb-4 font-mono">
              /{city}/services/{form.category?.toLowerCase() || "category"}/{slug}
            </p>
          )}

          {/* Progress bar */}
          <div className="w-full max-w-xs bg-gray-100 rounded-full h-1 mb-2 overflow-hidden mt-4">
            <div
              className={`anim-bar h-1 rounded-full ${isActive ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: "0%" }}
            />
          </div>
          <p className="text-xs text-gray-400 mb-5">Redirecting to services dashboard…</p>

          <button
            className="anim-btn bg-[#0B2560] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-900 transition"
            onClick={() => router.push("/admin/services")}
          >
            Go to Services Dashboard →
          </button>
        </div>
      </>
    );
  }

  const computedSlug = form.name ? toSlug(form.name) : "";

  return (
    <div className="max-w-4xl mx-auto">
      {/* PROGRESS BAR */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition ${
                step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 h-1 rounded-full">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-6 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* STEP 1: BASIC INFO */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">Basic Information</h2>

          <div>
            <label className="block text-sm font-semibold mb-2">Service Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="e.g., Advanced Dermal Fillers"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Location *</label>
              <select
                value={form.location}
                onChange={(e) => updateForm({ location: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Location</option>
                <option value="chennai">Chennai</option>
                <option value="bangalore">Bangalore</option>
                <option value="coimbatore">Coimbatore</option>
                <option value="kochi">Kochi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Category *</label>
              <select
                value={form.category}
                onChange={(e) => updateForm({ category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
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
              <label className="block text-sm font-semibold mb-2">Price *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateForm({ price: Number(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Duration (mins) *</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => updateForm({ duration: Number(e.target.value) })}
                min="5"
                max="480"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => updateForm({ currency: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SEO SETUP */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">
            SEO Setup — Search, Local & AI
          </h2>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Meta Title *{" "}
              <span className="text-gray-400 font-normal">{form.metaTitle.length}/60</span>
            </label>
            <input
              type="text"
              value={form.metaTitle}
              onChange={(e) => updateForm({ metaTitle: e.target.value })}
              placeholder="e.g., Advanced Dermal Fillers in Chennai | DR Youth Clinic"
              maxLength={60}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Keep it concise · Include service + city</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Meta Description *{" "}
              <span className="text-gray-400 font-normal">{form.metaDescription.length}/160</span>
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) => updateForm({ metaDescription: e.target.value })}
              placeholder="Describe what users will see in Google search results…"
              maxLength={160}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Focus Keywords{" "}
                <span className="text-gray-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => updateForm({ keywords: e.target.value })}
                placeholder="e.g., dermal fillers, lip augmentation, anti-aging"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Type your own or pick from suggestions below
              </p>
            </div>

            {/* Keyword suggestions — auto-generated from service name/category/location */}
            <KeywordSuggestions
              serviceName={form.name}
              category={form.category}
              location={form.location}
              keywords={form.keywords}
              onChange={(v) => updateForm({ keywords: v })}
            />
          </div>

          {/* URL Slug preview */}
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">URL Slug (auto-generated)</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-mono">
                dryouthclinic.com/{form.location || "city"}/services/{form.category?.toLowerCase() || "category"}/
              </span>
              <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {computedSlug || "service-name"}
              </span>
              {slugCheck.checking && (
                <span className="text-xs text-gray-400">checking…</span>
              )}
              {!slugCheck.checking && slugCheck.available === true && (
                <span className="text-xs text-green-600 font-semibold">✓ Available</span>
              )}
              {!slugCheck.checking && slugCheck.available === false && (
                <span className="text-xs text-red-500 font-semibold">
                  ✗ Taken
                  {slugCheck.suggestion && (
                    <span className="text-gray-500 font-normal ml-1">
                      → suggest: <span className="font-mono">{slugCheck.suggestion}</span>
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Live SEO / GEO / AIO preview */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Live Preview</p>
            <SeoPreviewCard
              title={form.metaTitle}
              description={form.metaDescription}
              keywords={form.keywords}
              slug={computedSlug}
              location={form.location}
              serviceName={form.name}
              benefits={form.benefits}
              narrative={form.narrative}
            />
          </div>
        </div>
      )}

      {/* STEP 3: CONTENT & MEDIA */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">Content & Media</h2>
          <div>
            <label className="block text-sm font-semibold mb-2">Treatment Narrative *</label>
            <textarea
              value={form.narrative}
              onChange={(e) => updateForm({ narrative: e.target.value })}
              placeholder="Describe the treatment, expected outcomes, who it's for…"
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Hero Image *</label>
            <ImageUpload
              onUpload={(data) => updateForm({ heroImage: data })}
              label="Service Hero Image (1200×800px recommended)"
              folder={`dr-youth-clinic/services/${form.location || 'general'}`}
            />
          </div>
        </div>
      )}

      {/* STEP 4: BENEFITS & PRICING */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">Benefits & Pricing</h2>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-semibold">Why Choose This Treatment? *</label>
              {form.benefits.length > 0 && (
                <span className="text-sm text-gray-600">{form.benefits.length} added</span>
              )}
            </div>

            {form.benefits.map((benefit, idx) => (
              <div key={idx} className="mb-4 p-4 border rounded-lg bg-gray-50">
                <div className="flex gap-2 mb-3">
                  <select
                    value={benefit.icon}
                    onChange={(e) => {
                      const updated = [...form.benefits];
                      updated[idx].icon = e.target.value;
                      updateForm({ benefits: updated });
                    }}
                    className="px-2 py-1 border rounded"
                  >
                    {ICONS.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={benefit.title}
                    onChange={(e) => {
                      const updated = [...form.benefits];
                      updated[idx].title = e.target.value;
                      updateForm({ benefits: updated });
                    }}
                    placeholder="Benefit title"
                    className="flex-1 px-3 py-1 border rounded"
                  />
                  <button
                    onClick={() => updateForm({ benefits: form.benefits.filter((_, i) => i !== idx) })}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={benefit.description}
                  onChange={(e) => {
                    const updated = [...form.benefits];
                    updated[idx].description = e.target.value;
                    updateForm({ benefits: updated });
                  }}
                  placeholder="Benefit description"
                  rows={2}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            ))}

            <button
              onClick={() =>
                updateForm({ benefits: [...form.benefits, { icon: "⭐", title: "", description: "" }] })
              }
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              + Add Benefit
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PUBLISH */}
      {step === 5 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">Publish Service</h2>

          <div>
            <label className="block text-sm font-semibold mb-3">Service Status</label>
            <div className="grid grid-cols-3 gap-3">
              {(["draft", "active", "hidden"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => updateForm({ status })}
                  className={`p-4 rounded-lg border-2 transition ${
                    form.status === status ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <div className="font-semibold capitalize">{status}</div>
                  <div className="text-xs text-gray-500">
                    {status === "draft" && "Only for admins"}
                    {status === "active" && "Public & bookable ✓"}
                    {status === "hidden" && "Hidden from public"}
                  </div>
                  {status === "active" && form.status !== "active" && (
                    <div className="text-[10px] text-blue-500 font-semibold mt-1">Recommended</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold mb-3">Service Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="font-semibold">Name:</span> {form.name}</p>
              <p><span className="font-semibold">Location:</span> {form.location}</p>
              <p><span className="font-semibold">Price:</span> {form.currency} {form.price}</p>
              <p><span className="font-semibold">Duration:</span> {form.duration} mins</p>
            </div>
            {computedSlug && (
              <p className="text-xs text-gray-500 mt-2 font-mono">
                URL: /{form.location}/services/{form.category?.toLowerCase() || "category"}/{computedSlug}
              </p>
            )}
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <div className="flex gap-4 mt-8">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            ← Previous
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={() => { if (validateStep(step)) setStep(step + 1); }}
            className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "Publishing…" : "Publish Service"}
          </button>
        )}
      </div>
    </div>
  );
}
