"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader, ArrowLeft, Save, Plus, X, Eye } from "lucide-react";
import ImageUpload from "@/app/admin/components/ImageUpload";
import VideoUpload from "@/app/admin/components/VideoUpload";
import { BANNER_TEMPLATES, type BannerTemplateType } from "@/app/lib/banners/types";
import { HERO_THEMES } from "@/app/lib/banners/heroThemes";
import { locations } from "@/app/data/locations";
import { CATEGORY_MAP } from "@/app/lib/serviceCategories";

// ─── Small reusable inputs (same pattern as app/admin/ai-assessment/page.tsx) ──

function Input({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${className}`}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full resize-none"
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between py-2.5 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative shrink-0 ${checked ? "bg-[#0B2560]" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item} onChange={(v) => onChange(items.map((x, idx) => (idx === i ? v : x)))} placeholder={placeholder} />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 shrink-0">
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="text-xs font-semibold text-[#0B2560] hover:text-[#1a3a6e] flex items-center gap-1">
        <Plus size={13} /> Add
      </button>
    </div>
  );
}

function CTAFields({ label, cta, onChange }: { label: string; cta: { label: string; href: string }; onChange: (v: { label: string; href: string }) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <Input value={cta?.label || ""} onChange={(v) => onChange({ ...cta, label: v })} placeholder="Button text" />
        <Input value={cta?.href || ""} onChange={(v) => onChange({ ...cta, href: v })} placeholder="/book" />
      </div>
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BannerEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [banner, setBanner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [smartRulesEnabled, setSmartRulesEnabled] = useState(false);
  const [doctors, setDoctors] = useState<{ _id: string; name: string; title: string }[]>([]);

  useEffect(() => {
    // Only the Glass Hero's doctorHighlight picker needs this, but it's
    // cheap enough (admin-only, one small list) to just always fetch
    // rather than gating it behind templateType, which isn't known until
    // the banner itself has loaded.
    fetch("/api/admin/doctors")
      .then((r) => r.json())
      .then((d) => { if (d.success) setDoctors(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/admin/banners/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setBanner(d.data);
          setSmartRulesEnabled(!!d.data.smartRules);
        } else {
          setError(d.message || "Banner not found");
        }
      })
      .catch(() => setError("Failed to load banner"))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (patch: Record<string, any>) => {
    setBanner((prev: any) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...banner };
      // Explicitly null out (not delete-the-key) — the PUT route passes
      // this body straight to findByIdAndUpdate, which only $sets keys
      // that are actually present; omitting the key entirely would leave
      // a previously-saved smartRules subdocument stuck in the database
      // even though the toggle shows as off.
      if (!smartRulesEnabled) payload.smartRules = null;
      else if (!payload.smartRules) {
        payload.smartRules = { daysOfWeek: [], timeWindowStart: null, timeWindowEnd: null, dateRangeStart: null, dateRangeEnd: null, seasonStartMonth: null, seasonEndMonth: null };
      }
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setBanner(data.data);
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400"><Loader className="animate-spin mx-auto" size={22} /></div>;
  if (!banner) return <div className="text-center py-20 text-red-500">{error || "Banner not found"}</div>;

  const templateType: BannerTemplateType = banner.templateType;
  const templateDef = BANNER_TEMPLATES.find((t) => t.type === templateType);
  const toggleDayOfWeek = (day: number) => {
    const rules = banner.smartRules || { daysOfWeek: [], timeWindowStart: null, timeWindowEnd: null, dateRangeStart: null, dateRangeEnd: null };
    const days = rules.daysOfWeek.includes(day) ? rules.daysOfWeek.filter((d: number) => d !== day) : [...rules.daysOfWeek, day];
    set({ smartRules: { ...rules, daysOfWeek: days } });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/banners" className="text-gray-400 hover:text-[#0B2560]"><ArrowLeft size={18} /></Link>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{templateDef?.icon} {templateDef?.label}</p>
            <h1 className="text-xl font-bold text-gray-900">{banner.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/banners/${id}/preview`} target="_blank" className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">
            <Eye size={14} /> Preview
          </Link>
          <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${saved ? "bg-green-600" : "bg-[#0B2560] hover:bg-[#1a3a6e]"} disabled:opacity-50`}>
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {/* Shared fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Content</p>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Admin Title (internal only)</label>
          <Input value={banner.title} onChange={(v) => set({ title: v })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Headline</label>
          <Textarea value={banner.headline} onChange={(v) => set({ headline: v })} rows={2} placeholder="Use \n for a line break" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Subtitle / Eyebrow</label>
            <Input value={banner.subtitle} onChange={(v) => set({ subtitle: v })} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
          <Textarea value={banner.description} onChange={(v) => set({ description: v })} rows={2} />
        </div>
      </div>

      {/* CTAs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Call to Action</p>
        <CTAFields label={templateType === "glass-hero" ? "Primary CTA (e.g. Book Consultation)" : "Primary CTA"} cta={banner.primaryCTA} onChange={(v) => set({ primaryCTA: v })} />
        <CTAFields label={templateType === "glass-hero" ? "Secondary CTA (e.g. Free AI Assessment)" : "Secondary CTA (optional)"} cta={banner.secondaryCTA} onChange={(v) => set({ secondaryCTA: v })} />
        {templateType === "glass-hero" && (
          <CTAFields label="Tertiary CTA (e.g. WhatsApp Expert)" cta={banner.tertiaryCTA} onChange={(v) => set({ tertiaryCTA: v })} />
        )}
      </div>

      {/* Images / video */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-bold text-gray-700">Media</p>
        <ImageUpload
          label={templateType === "glass-hero" ? "Background Image (optional — subtle, tinted behind the glass)" : "Desktop Image"}
          folder="dr-youth-clinic/banners"
          currentPublicId={banner.desktopImage?.publicId}
          onUpload={(img) => set({ desktopImage: img })}
        />
        {templateType !== "glass-hero" && (
          <ImageUpload label="Mobile Image (optional — falls back to desktop)" folder="dr-youth-clinic/banners" currentPublicId={banner.mobileImage?.publicId} onUpload={(img) => set({ mobileImage: img })} />
        )}
        {templateType === "before-after" && (
          <ImageUpload label="Before Image" folder="dr-youth-clinic/banners" currentPublicId={banner.beforeImage?.publicId} onUpload={(img) => set({ beforeImage: img })} />
        )}
        {(templateType === "clinic-experience" || templateType === "glass-hero") && (
          <VideoUpload label={templateType === "glass-hero" ? "Background Video (optional — overrides the background image above)" : "Video (optional)"} currentUrl={banner.video?.url} onUpload={(vid) => set({ video: vid })} />
        )}
      </div>

      {/* Template-specific fields */}
      {templateType === "premium-hero" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-sm font-bold text-gray-700">Stat Badges</p>
          {(banner.statBadges || []).map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={s.value} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, value: v } : x)) })} placeholder="20+" />
              <Input value={s.label} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, label: v } : x)) })} placeholder="Years Experience" />
              <button onClick={() => set({ statBadges: banner.statBadges.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
            </div>
          ))}
          <button onClick={() => set({ statBadges: [...(banner.statBadges || []), { value: "", label: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Stat</button>

          <p className="text-sm font-bold text-gray-700 pt-2">Trust Badges</p>
          {(banner.trustBadges || []).map((b: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={b.icon} onChange={(v) => set({ trustBadges: banner.trustBadges.map((x: any, idx: number) => (idx === i ? { ...x, icon: v } : x)) })} placeholder="✅" className="max-w-[70px]" />
              <Input value={b.text} onChange={(v) => set({ trustBadges: banner.trustBadges.map((x: any, idx: number) => (idx === i ? { ...x, text: v } : x)) })} placeholder="Certified Doctors" />
              <button onClick={() => set({ trustBadges: banner.trustBadges.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
            </div>
          ))}
          <button onClick={() => set({ trustBadges: [...(banner.trustBadges || []), { icon: "✅", text: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Trust Badge</button>

          <Toggle checked={!!banner.rating?.enabled} onChange={(v) => set({ rating: { ...banner.rating, enabled: v } })} label="Show star rating" />
          {banner.rating?.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <Input value={String(banner.rating.value)} onChange={(v) => set({ rating: { ...banner.rating, value: Number(v) || 0 } })} placeholder="4.8" />
              <Input value={String(banner.rating.reviewCount)} onChange={(v) => set({ rating: { ...banner.rating, reviewCount: Number(v) || 0 } })} placeholder="1200" />
            </div>
          )}
        </div>
      )}

      {templateType === "service" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
          <p className="text-sm font-bold text-gray-700">Benefits (bullet list)</p>
          <ListEditor items={banner.benefits || []} onChange={(v) => set({ benefits: v })} placeholder="Reduces Hair Fall" />
        </div>
      )}

      {templateType === "doctor" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
          <p className="text-sm font-bold text-gray-700">Achievements (bullet list)</p>
          <ListEditor items={banner.achievements || []} onChange={(v) => set({ achievements: v })} placeholder="10,000+ Successful Surgeries" />
        </div>
      )}

      {templateType === "glass-hero" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">Background Theme & Motion</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Theme</label>
                <select value={banner.heroTheme || "aurora"} onChange={(e) => set({ heroTheme: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  {HERO_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Motion Intensity</label>
                <select value={banner.motionIntensity || "full"} onChange={(e) => set({ motionIntensity: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  <option value="full">Full</option>
                  <option value="reduced">Reduced</option>
                  <option value="off">Off</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">A visitor's own device "reduce motion" setting always overrides this.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">Lottie Animation (optional)</p>
            <Input value={banner.lottieUrl || ""} onChange={(v) => set({ lottieUrl: v })} placeholder="https://.../animation.json" />
            {banner.lottieUrl && (
              <select value={banner.lottiePlacement || "beside-heading"} onChange={(e) => set({ lottiePlacement: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                <option value="beside-heading">Beside the subtitle badge</option>
                <option value="background">Full background</option>
                <option value="floating-badge">Floating corner badge</option>
              </select>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">Statistics</p>
            {(banner.statBadges || []).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={s.value} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, value: v } : x)) })} placeholder="15,000+" />
                <Input value={s.label} onChange={(v) => set({ statBadges: banner.statBadges.map((x: any, idx: number) => (idx === i ? { ...x, label: v } : x)) })} placeholder="Happy Patients" />
                <button onClick={() => set({ statBadges: banner.statBadges.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
              </div>
            ))}
            <button onClick={() => set({ statBadges: [...(banner.statBadges || []), { value: "", label: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Stat</button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">Service Chips</p>
            {(banner.serviceChips || []).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={c.icon} onChange={(v) => set({ serviceChips: banner.serviceChips.map((x: any, idx: number) => (idx === i ? { ...x, icon: v } : x)) })} placeholder="💆" className="max-w-[60px]" />
                <Input value={c.label} onChange={(v) => set({ serviceChips: banner.serviceChips.map((x: any, idx: number) => (idx === i ? { ...x, label: v } : x)) })} placeholder="Hair" />
                <Input value={c.href} onChange={(v) => set({ serviceChips: banner.serviceChips.map((x: any, idx: number) => (idx === i ? { ...x, href: v } : x)) })} placeholder="/chennai/services/hair" />
                <button onClick={() => set({ serviceChips: banner.serviceChips.filter((_: any, idx: number) => idx !== i) })} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
              </div>
            ))}
            <button onClick={() => set({ serviceChips: [...(banner.serviceChips || []), { icon: "✨", label: "", href: "" }] })} className="text-xs font-semibold text-[#0B2560] flex items-center gap-1"><Plus size={13} /> Add Chip</button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">Doctor Highlight (optional)</p>
            <select
              value={banner.doctorHighlight?.doctorId?._id || banner.doctorHighlight?.doctorId || ""}
              onChange={(e) => set({ doctorHighlight: { ...banner.doctorHighlight, doctorId: e.target.value || null } })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">None</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>{d.name} — {d.title}</option>
              ))}
            </select>
            {(banner.doctorHighlight?.doctorId?._id || banner.doctorHighlight?.doctorId) && (
              <Input
                value={banner.doctorHighlight?.tagline || ""}
                onChange={(v) => set({ doctorHighlight: { ...banner.doctorHighlight, tagline: v } })}
                placeholder="Tagline override (optional — defaults to their title)"
              />
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <Toggle checked={!!banner.assistantTeaser?.enabled} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, enabled: v } })} label="👋 Show AI Assistant teaser card" />
            {banner.assistantTeaser?.enabled && (
              <>
                <Input value={banner.assistantTeaser?.text || ""} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, text: v } })} placeholder="Need help choosing a treatment?" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={banner.assistantTeaser?.ctaLabel || ""} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, ctaLabel: v } })} placeholder="Start Assessment" />
                  <Input value={banner.assistantTeaser?.href || ""} onChange={(v) => set({ assistantTeaser: { ...banner.assistantTeaser, href: v } })} placeholder="/skin-quiz" />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Overlay */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Overlay</p>
        <Toggle checked={!!banner.overlay?.enabled} onChange={(v) => set({ overlay: { ...banner.overlay, enabled: v } })} label="Enable dark/gradient overlay on the banner image" />
        {banner.overlay?.enabled && (
          <div className="grid grid-cols-2 gap-3 items-center">
            <select value={banner.overlay.style} onChange={(e) => set({ overlay: { ...banner.overlay, style: e.target.value } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="dark">Dark</option>
              <option value="gradient">Gradient</option>
            </select>
            <input type="range" min={0} max={1} step={0.05} value={banner.overlay.opacity} onChange={(e) => set({ overlay: { ...banner.overlay, opacity: Number(e.target.value) } })} />
          </div>
        )}
      </div>

      {/* Targeting */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Where to Show</p>
        <Toggle checked={!!banner.showOnHomepage} onChange={(v) => set({ showOnHomepage: v })} label="Homepage" />
        <Toggle checked={!!banner.showOnLocationPage} onChange={(v) => set({ showOnLocationPage: v })} label="Location Pages" />
        {banner.showOnLocationPage && (
          <div className="pl-4 space-y-1.5">
            <p className="text-xs text-gray-400">Leave all unchecked to show on every location.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(locations).map(([key, loc]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={(banner.targetLocations || []).includes(key)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...(banner.targetLocations || []), key] : (banner.targetLocations || []).filter((x: string) => x !== key);
                      set({ targetLocations: next });
                    }}
                  />
                  {loc.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <Toggle checked={!!banner.showOnServicePage} onChange={(v) => set({ showOnServicePage: v })} label="Service Pages" />
        {banner.showOnServicePage && (
          <div className="pl-4">
            <p className="text-xs text-gray-400 mb-1.5">Leave blank to show on every service. Enter service URL slugs, comma-separated.</p>
            <Input
              value={(banner.targetServices || []).join(", ")}
              onChange={(v) => set({ targetServices: v.split(",").map((x) => x.trim()).filter(Boolean) })}
              placeholder="e.g. prp-hair-treatment, laser-hair-removal"
            />
          </div>
        )}
        <Toggle checked={!!banner.showOnCategoryPage} onChange={(v) => set({ showOnCategoryPage: v })} label="Category Listing Pages (e.g. /chennai/services/hair)" />
        {banner.showOnCategoryPage && (
          <div className="pl-4 space-y-1.5">
            <p className="text-xs text-gray-400">Leave all unchecked to show on every category.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(CATEGORY_MAP).map(([slug, label]) => (
                <label key={slug} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={(banner.targetCategories || []).includes(slug)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...(banner.targetCategories || []), slug] : (banner.targetCategories || []).filter((x: string) => x !== slug);
                      set({ targetCategories: next });
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-700">Schedule &amp; Priority</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date (optional)</label>
            <input type="date" value={banner.startDate ? banner.startDate.slice(0, 10) : ""} onChange={(e) => set({ startDate: e.target.value || null })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date (optional)</label>
            <input type="date" value={banner.endDate ? banner.endDate.slice(0, 10) : ""} onChange={(e) => set({ endDate: e.target.value || null })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Priority (higher wins ties)</label>
            <input type="number" value={banner.priority} onChange={(e) => set({ priority: Number(e.target.value) || 0 })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
            <select value={banner.status} onChange={(e) => set({ status: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Smart Rules */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <Toggle checked={smartRulesEnabled} onChange={setSmartRulesEnabled} label="⚡ Smart Rules (day-of-week / time-of-day / festival date range)" />
        {smartRulesEnabled && (
          <div className="space-y-3 pt-1">
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Times are evaluated in the server's timezone (UTC), not IST.</p>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Days of Week (leave all unchecked = every day)</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDayOfWeek(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${(banner.smartRules?.daysOfWeek || []).includes(i) ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Time Window Start (optional)</label>
                <input type="time" value={banner.smartRules?.timeWindowStart || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), timeWindowStart: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Time Window End (optional)</label>
                <input type="time" value={banner.smartRules?.timeWindowEnd || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), timeWindowEnd: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Season (recurring every year — e.g. hot season = March-June)</label>
              <div className="grid grid-cols-2 gap-3">
                <select value={banner.smartRules?.seasonStartMonth || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), seasonStartMonth: e.target.value ? Number(e.target.value) : null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  <option value="">Start month…</option>
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select value={banner.smartRules?.seasonEndMonth || ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), seasonEndMonth: e.target.value ? Number(e.target.value) : null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  <option value="">End month…</option>
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Festival/Offer Start Date (optional)</label>
                <input type="date" value={banner.smartRules?.dateRangeStart ? banner.smartRules.dateRangeStart.slice(0, 10) : ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), dateRangeStart: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Festival/Offer End Date (optional)</label>
                <input type="date" value={banner.smartRules?.dateRangeEnd ? banner.smartRules.dateRangeEnd.slice(0, 10) : ""} onChange={(e) => set({ smartRules: { ...(banner.smartRules || {}), dateRangeEnd: e.target.value || null } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
