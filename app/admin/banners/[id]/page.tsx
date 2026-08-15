"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader, ArrowLeft, Save, Eye } from "lucide-react";
import { BANNER_TEMPLATES, type BannerTemplateType } from "@/app/lib/banners/types";
import BannerContentFields from "./fields/BannerContentFields";
import BannerCTASection from "./fields/BannerCTASection";
import BannerMediaFields from "./fields/BannerMediaFields";
import BannerTemplateFields from "./fields/BannerTemplateFields";
import BannerOverlayFields from "./fields/BannerOverlayFields";
import BannerPresentationFields from "./fields/BannerPresentationFields";
import BannerTargetingFields from "./fields/BannerTargetingFields";
import BannerScheduleFields from "./fields/BannerScheduleFields";
import BannerSmartRulesFields from "./fields/BannerSmartRulesFields";
import AssetPickerModal from "./fields/AssetPickerModal";

const TABS = [
  "Content",
  "Call to Action",
  "Media",
  "Presentation & Animation",
  "Where to Show",
  "Schedule & Priority",
  "Advanced",
] as const;
type Tab = (typeof TABS)[number];

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
  const [experienceAdvanced, setExperienceAdvanced] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerType, setAssetPickerType] = useState<"lottie" | "rive">("lottie");
  const [libraryAssetsRaw, setLibraryAssetsRaw] = useState<any[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [doctors, setDoctors] = useState<{ _id: string; name: string; title: string }[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Content");

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
          const ov = d.data.experienceOverrides || {};
          setExperienceAdvanced(Object.values(ov).some((v) => v !== null && v !== undefined));
        } else {
          setError(d.message || "Banner not found");
        }
      })
      .catch(() => setError("Failed to load banner"))
      .finally(() => setLoading(false));
  }, [id]);

  const openAssetPicker = (assetType: "lottie" | "rive") => {
    setAssetPickerType(assetType);
    setAssetPickerOpen(true);
    if (libraryAssetsRaw.length === 0) {
      setLibraryLoading(true);
      fetch("/api/admin/animation-assets")
        .then((r) => r.json())
        .then((d) => { if (d.success) setLibraryAssetsRaw(d.data.filter((a: any) => a.status === "active")); })
        .finally(() => setLibraryLoading(false));
    }
  };
  const libraryAssets = libraryAssetsRaw.filter((a: any) => a.type === assetPickerType);

  const set = (patch: Record<string, any>) => {
    setBanner((prev: any) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async (overrides?: Record<string, any>) => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...banner, ...overrides };
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
          <button onClick={() => handleSave()} disabled={saving} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${saved ? "bg-green-600" : "bg-[#0B2560] hover:bg-[#1a3a6e]"} disabled:opacity-50`}>
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {/* Status — deliberately its own prominent bar right under the header,
          not buried in the Schedule & Priority tab below (where the actual
          status dropdown still lives, for reordering/bulk edits) — a banner
          that's fully configured but still "Draft" shows on none of the
          pages selected below, and that was easy to miss as a small select
          next to "Priority". Always visible regardless of active tab. */}
      {banner.status === "draft" && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-sm text-amber-800">
            <span className="font-bold">Draft</span> — not visible anywhere on the site yet, even on the pages selected below.
          </p>
          <button
            onClick={() => handleSave({ status: "active" })}
            disabled={saving}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            Publish Now
          </button>
        </div>
      )}
      {banner.status === "active" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <p className="text-sm text-green-800"><span className="font-bold">Active</span> — live on every page selected below that it's eligible for.</p>
        </div>
      )}
      {banner.status === "disabled" && (
        <div className="flex items-center justify-between gap-3 bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3">
          <p className="text-sm text-gray-600"><span className="font-bold">Disabled</span> — hidden from the site until re-enabled.</p>
          <button
            onClick={() => handleSave({ status: "active" })}
            disabled={saving}
            className="shrink-0 bg-[#0B2560] hover:bg-[#1a3a6e] text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            Re-enable
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 -mb-px">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === tab
                ? "border-[#0B2560] text-[#0B2560]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Content" && (
        <BannerContentFields banner={banner} set={set} />
      )}

      {activeTab === "Call to Action" && (
        <BannerCTASection banner={banner} set={set} templateType={templateType} />
      )}

      {activeTab === "Media" && (
        <>
          <BannerMediaFields banner={banner} set={set} templateType={templateType} />
          <BannerOverlayFields banner={banner} set={set} />
          <BannerTemplateFields
            banner={banner}
            set={set}
            templateType={templateType}
            doctors={doctors}
            experienceAdvanced={experienceAdvanced}
            setExperienceAdvanced={setExperienceAdvanced}
            openAssetPicker={openAssetPicker}
          />
        </>
      )}

      {activeTab === "Presentation & Animation" && (
        <BannerPresentationFields banner={banner} set={set} openAssetPicker={openAssetPicker} />
      )}

      {activeTab === "Where to Show" && (
        <BannerTargetingFields banner={banner} set={set} />
      )}

      {activeTab === "Schedule & Priority" && (
        <BannerScheduleFields banner={banner} set={set} />
      )}

      {activeTab === "Advanced" && (
        <BannerSmartRulesFields
          banner={banner}
          set={set}
          templateType={templateType}
          smartRulesEnabled={smartRulesEnabled}
          setSmartRulesEnabled={setSmartRulesEnabled}
        />
      )}

      <AssetPickerModal
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        assetPickerType={assetPickerType}
        libraryLoading={libraryLoading}
        libraryAssets={libraryAssets}
        onPick={(a) => {
          if (assetPickerType === "lottie") set({ lottieUrl: a.file.url });
          else set({ riveUrl: a.file.url });
          setAssetPickerOpen(false);
        }}
      />
    </div>
  );
}
