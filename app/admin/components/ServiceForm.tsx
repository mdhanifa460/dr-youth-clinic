"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import ImageUpload from "./ImageUpload";

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

export default function ServiceForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<FormData>(
    initialData || {
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

      status: "draft",
    }
  );

  const updateForm = (data: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...data }));
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!form.name.trim()) {
          setError("Service name is required");
          return false;
        }
        if (!form.location) {
          setError("Location is required");
          return false;
        }
        if (!form.category) {
          setError("Category is required");
          return false;
        }
        break;

      case 2:
        if (!form.metaTitle.trim()) {
          setError("Meta title is required");
          return false;
        }
        if (form.metaTitle.length > 60) {
          setError("Meta title should be max 60 characters");
          return false;
        }
        if (!form.metaDescription.trim()) {
          setError("Meta description is required");
          return false;
        }
        if (form.metaDescription.length > 160) {
          setError("Meta description should be max 160 characters");
          return false;
        }
        break;

      case 3:
        if (!form.narrative.trim()) {
          setError("Treatment narrative is required");
          return false;
        }
        if (!form.heroImage) {
          setError("Hero image is required");
          return false;
        }
        break;

      case 4:
        if (form.benefits.length === 0) {
          setError("Add at least one benefit");
          return false;
        }
        if (!form.price || form.price <= 0) {
          setError("Price is required");
          return false;
        }
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
          keywords: form.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Failed to save service");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/services");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 p-8 rounded-lg text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold text-green-700 mb-2">
          Service Created Successfully!
        </h2>
        <p className="text-gray-600">Redirecting to services list...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* PROGRESS BAR */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition ${
                step >= s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
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

      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-6 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* STEP 1: BASIC INFO */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">Basic Information</h2>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Service Name *
            </label>
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
              <label className="block text-sm font-semibold mb-2">
                Location *
              </label>
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
              <label className="block text-sm font-semibold mb-2">
                Category *
              </label>
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
              <label className="block text-sm font-semibold mb-2">
                Price *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateForm({ price: Number(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Duration (mins) *
              </label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) =>
                  updateForm({ duration: Number(e.target.value) })
                }
                min="5"
                max="480"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Currency
              </label>
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
            SEO Setup (Optimize for Search Engines)
          </h2>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Meta Title * <span className="text-gray-500">{form.metaTitle.length}/60</span>
            </label>
            <input
              type="text"
              value={form.metaTitle}
              onChange={(e) => updateForm({ metaTitle: e.target.value })}
              placeholder="e.g., Advanced Dermal Fillers in Chennai | DR Youth Clinic"
              maxLength={60}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Keep it concise and include service + location</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Meta Description * <span className="text-gray-500">{form.metaDescription.length}/160</span>
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) =>
                updateForm({ metaDescription: e.target.value })
              }
              placeholder="Describe what users will see in Google search results..."
              maxLength={160}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Focus Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={form.keywords}
              onChange={(e) => updateForm({ keywords: e.target.value })}
              placeholder="e.g., dermal fillers, lip augmentation, anti-aging"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SEO SCORE PREVIEW */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold">SEO Health Score</p>
              <div className="text-xl font-bold text-blue-600">
                {form.metaTitle && form.metaDescription ? "✓ Good" : "○ Improve"}
              </div>
            </div>
            <ul className="text-sm space-y-1 text-gray-600">
              <li className={form.metaTitle ? "text-green-600" : ""}>
                ✓ Meta title set
              </li>
              <li className={form.metaDescription ? "text-green-600" : ""}>
                ✓ Meta description set
              </li>
              <li className={form.keywords ? "text-green-600" : ""}>
                ✓ Keywords added
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 3: CONTENT & MEDIA */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">
            Content & Media
          </h2>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Treatment Narrative *
            </label>
            <textarea
              value={form.narrative}
              onChange={(e) => updateForm({ narrative: e.target.value })}
              placeholder="Describe the treatment, expected outcomes, who it's for..."
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Hero Image *
            </label>
            <ImageUpload
              onUpload={(data) => updateForm({ heroImage: data })}
              label="Service Hero Image (1200x800px recommended)"
            />
          </div>
        </div>
      )}

      {/* STEP 4: BENEFITS & PRICING */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-lg shadow-lg space-y-6">
          <h2 className="text-2xl font-bold text-blue-600">
            Benefits & Pricing
          </h2>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-semibold">
                Why Choose This Treatment? *
              </label>
              {form.benefits.length > 0 && (
                <span className="text-sm text-gray-600">
                  {form.benefits.length} added
                </span>
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
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
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
                    onClick={() => {
                      const updated = form.benefits.filter((_, i) => i !== idx);
                      updateForm({ benefits: updated });
                    }}
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
              onClick={() => {
                const updated = [...form.benefits];
                updated.push({ icon: "⭐", title: "", description: "" });
                updateForm({ benefits: updated });
              }}
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
            <label className="block text-sm font-semibold mb-3">
              Service Status
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["draft", "active", "hidden"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => updateForm({ status })}
                  className={`p-4 rounded-lg border-2 transition ${
                    form.status === status
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="font-semibold capitalize">{status}</div>
                  <div className="text-xs text-gray-500">
                    {status === "draft" && "Only for admins"}
                    {status === "active" && "Public & bookable"}
                    {status === "hidden" && "Hidden from public"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SUMMARY */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold mb-3">Service Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>
                <span className="font-semibold">Name:</span> {form.name}
              </p>
              <p>
                <span className="font-semibold">Location:</span> {form.location}
              </p>
              <p>
                <span className="font-semibold">Price:</span> {form.currency}{" "}
                {form.price}
              </p>
              <p>
                <span className="font-semibold">Duration:</span> {form.duration}{" "}
                mins
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION BUTTONS */}
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
            onClick={() => {
              if (validateStep(step)) {
                setStep(step + 1);
              }
            }}
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
            {loading ? "Publishing..." : "Publish Service"}
          </button>
        )}
      </div>
    </div>
  );
}
