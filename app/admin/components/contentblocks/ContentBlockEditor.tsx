"use client";

import { useEffect, useState } from "react";
import { Plus, LayoutTemplate } from "lucide-react";
import SectionList from "@/app/admin/components/builder/SectionList";
import SectionCard from "@/app/admin/components/builder/SectionCard";
import SaveTemplateModal from "@/app/admin/components/builder/SaveTemplateModal";
import TemplatePicker from "@/app/admin/components/builder/TemplatePicker";
import MediaGalleryModal from "@/app/admin/components/MediaGalleryModal";
import ContentHealthCard from "./ContentHealthCard";
import {
  CONTENT_BLOCK_TYPES,
  newBlock,
  type ContentBlock,
  type ContentBlockType,
  type ContentBlockSourceSystem,
  type BlockServiceContext,
  type RelatedEntityType,
} from "@/app/lib/contentBlocks/types";
import RichTextEditor from "./RichTextEditor";

type SourceSystem = ContentBlockSourceSystem;

type RelatedEntityOption = { _id: string; name?: string; title?: string };

const RELATED_ENTITY_LABELS: Record<RelatedEntityType, string> = {
  service: "A Service",
  doctor: "A Doctor",
  blog: "A Blog Post",
  video: "A Video",
  offer: "An Offer",
  "landing-page": "A Landing Page",
};

// Which admin list endpoint backs each entity type's picker — fetched lazily
// (only once a type is actually selected) rather than loading all 6 up front.
const RELATED_ENTITY_ENDPOINTS: Record<RelatedEntityType, string> = {
  service: "/api/admin/services",
  doctor: "/api/admin/doctors",
  blog: "/api/admin/blog",
  video: "/api/admin/videos",
  offer: "/api/admin/offers",
  "landing-page": "/api/admin/landing-pages",
};

function RelatedLinkEditForm({
  data,
  set,
  relatedEntities,
  ensureEntitiesLoaded,
}: {
  data: Record<string, any>;
  set: (patch: Record<string, any>) => void;
  relatedEntities: Partial<Record<RelatedEntityType, RelatedEntityOption[]>>;
  ensureEntitiesLoaded: (type: RelatedEntityType) => void;
}) {
  useEffect(() => {
    if (data.entityType) ensureEntitiesLoaded(data.entityType as RelatedEntityType);
  }, [data.entityType]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = data.entityType ? relatedEntities[data.entityType as RelatedEntityType] || [] : [];

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <select
          value={data.entityType || ""}
          onChange={(e) => set({ entityType: e.target.value, entityId: "" })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Link to… —</option>
          {(Object.keys(RELATED_ENTITY_LABELS) as RelatedEntityType[]).map((type) => (
            <option key={type} value={type}>{RELATED_ENTITY_LABELS[type]}</option>
          ))}
        </select>
        <select
          value={data.entityId || ""}
          onChange={(e) => set({ entityId: e.target.value })}
          disabled={!data.entityType}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-300"
        >
          <option value="">{data.entityType ? "— Select —" : "Pick a type first"}</option>
          {options.map((o) => (
            <option key={o._id} value={o._id}>{o.name || o.title}</option>
          ))}
        </select>
      </div>
      {data.entityType === "offer" && (
        <p className="text-xs text-gray-400 italic">Offers don&apos;t have individual pages yet — this links to the main Offers page.</p>
      )}
      <input
        value={data.label || ""}
        onChange={(e) => set({ label: e.target.value })}
        placeholder="Custom link text (optional — defaults to the entity's own title)"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// Live one-line summary shown on a reference block's card so an admin can
// tell what it will render without leaving this form — the block itself
// stores no data (see app/lib/contentBlocks/types.ts).
const REFERENCE_SUMMARY: Partial<Record<ContentBlockType, (ctx?: BlockServiceContext) => string>> = {
  "faq-block": (ctx) => (ctx?.faq?.length ? `Showing ${ctx.faq.length} FAQ${ctx.faq.length === 1 ? "" : "s"} from the FAQ section below.` : "No FAQs added yet — add some in the FAQ section of this form, or this block will render empty."),
  "benefits-block": (ctx) => (ctx?.benefits?.length ? `Showing ${ctx.benefits.length} benefit${ctx.benefits.length === 1 ? "" : "s"} from the Benefits section below.` : "No benefits added yet — add some in the Benefits section of this form, or this block will render empty."),
  "treatment-steps-block": (ctx) => (ctx?.treatmentSteps?.length ? `Showing ${ctx.treatmentSteps.length} step${ctx.treatmentSteps.length === 1 ? "" : "s"} from the Treatment Journey Steps section below.` : "No treatment steps added yet — add some below, or this block will render empty."),
  "recovery-timeline-block": (ctx) => (ctx?.recoveryTime?.trim() ? `Showing the recovery timeline for "${ctx.recoveryTime}" from below.` : "No recovery time set yet — set one below, or this block will render empty."),
  "journey-block": () => "Showing this service's Multi-Session Journey from below (uses default phases for anything left blank).",
  "journey-explorer-block": (ctx) => (ctx?.journeyExplorerVisible && ctx.journeyExplorer?.length ? `Showing the ${ctx.journeyExplorer.length}-stage Interactive Journey Explorer from below.` : "The Interactive Journey Explorer is empty or hidden below — this block will render nothing until it's filled in and made visible."),
  "comparison-block": (ctx) => (ctx?.painLevel?.trim() ? "Showing the auto-generated comparison against similar services (uses Pain Level below)." : "This compares against similar services automatically — set Pain Level below for a more complete table."),
};

function ReferenceBlockSummary({ type, serviceContext }: { type: ContentBlockType; serviceContext?: BlockServiceContext }) {
  const summarize = REFERENCE_SUMMARY[type];
  if (!summarize) return null;
  return <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">{summarize(serviceContext)}</p>;
}

// "✨ Improve Writing" — one AI action, one block type, on-demand only (never
// runs automatically). Loading/error state mirrors the existing convention
// in app/admin/intelligence/components/AIAdvisor.tsx.
function ParagraphEditForm({
  data,
  set,
  sourceSystem,
  contextLabel,
}: {
  data: Record<string, any>;
  set: (patch: Record<string, any>) => void;
  sourceSystem: SourceSystem;
  contextLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const improve = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content-blocks/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: data.html || "", sourceSystem, context: contextLabel }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Improve Writing failed");
      set({ html: json.data.html });
    } catch (e: any) {
      setError(e.message || "Improve Writing failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <RichTextEditor html={data.html || ""} onChange={(html) => set({ html })} />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={improve}
          disabled={loading || !data.html?.trim()}
          className="text-xs font-semibold text-[#0B2560] bg-[#f6faff] border border-[#0B2560]/10 rounded-lg px-3 py-1.5 hover:bg-[#0B2560]/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "✨ Improving…" : "✨ Improve Writing"}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

function BlockEditForm({
  block,
  onChange,
  onPickImage,
  serviceContext,
  doctors,
  relatedEntities,
  ensureEntitiesLoaded,
  sourceSystem,
}: {
  block: ContentBlock;
  onChange: (data: Record<string, any>) => void;
  onPickImage: () => void;
  serviceContext?: BlockServiceContext;
  doctors: { _id: string; name: string }[];
  relatedEntities: Partial<Record<RelatedEntityType, RelatedEntityOption[]>>;
  ensureEntitiesLoaded: (type: RelatedEntityType) => void;
  sourceSystem: SourceSystem;
}) {
  const data = block.data;
  const set = (patch: Record<string, any>) => onChange({ ...data, ...patch });

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {[2, 3, 4].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => set({ level })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  data.level === level ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                H{level}
              </button>
            ))}
          </div>
          <input
            value={data.text || ""}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Heading text"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case "paragraph":
      return (
        <ParagraphEditForm
          data={data}
          set={set}
          sourceSystem={sourceSystem}
          contextLabel={serviceContext?.serviceName}
        />
      );

    case "bullet-list":
    case "numbered-list": {
      const items: string[] = data.items?.length ? data.items : [""];
      const setItem = (i: number, val: string) => set({ items: items.map((it: string, idx: number) => (idx === i ? val : it)) });
      const addItem = () => set({ items: [...items, ""] });
      const removeItem = (i: number) => set({ items: items.filter((_: string, idx: number) => idx !== i) });
      return (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 shrink-0">{block.type === "numbered-list" ? `${i + 1}.` : "•"}</span>
              <input
                value={item}
                onChange={(e) => setItem(i, e.target.value)}
                placeholder="List item"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add item</button>
        </div>
      );
    }

    case "image":
      return (
        <div className="space-y-2">
          {data.url ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.url} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-100" />
              <button type="button" onClick={onPickImage} className="text-xs font-semibold text-[#0B2560] hover:underline">Change Image</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onPickImage}
              className="w-full py-6 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-400 hover:border-[#0B2560]/40 hover:bg-[#f6faff] transition"
            >
              📷 Choose Image
            </button>
          )}
          <input
            value={data.alt || ""}
            onChange={(e) => set({ alt: e.target.value })}
            placeholder="Alt text (for SEO & accessibility)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={data.caption || ""}
            onChange={(e) => set({ caption: e.target.value })}
            placeholder="Caption (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case "quote":
      return (
        <div className="space-y-2">
          <textarea
            value={data.text || ""}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Quote text"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <input
            value={data.attribution || ""}
            onChange={(e) => set({ attribution: e.target.value })}
            placeholder="Attribution (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case "callout": {
      const variants = [
        { value: "info", label: "ℹ️ Info" },
        { value: "warning", label: "⚠️ Warning" },
        { value: "success", label: "✅ Success" },
        { value: "medical", label: "⚕️ Medical Warning" },
      ];
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            {variants.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => set({ variant: v.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  (data.variant || "info") === v.value ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <textarea
            value={data.text || ""}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Callout text"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      );
    }

    case "cta":
      return (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={data.label || ""}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="Button text"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={data.href || ""}
            onChange={(e) => set({ href: e.target.value })}
            placeholder="Link (e.g. /book)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case "divider":
      return <p className="text-xs text-gray-400 italic">A horizontal divider — no settings needed.</p>;

    case "faq-block":
    case "benefits-block":
    case "treatment-steps-block":
    case "recovery-timeline-block":
    case "journey-block":
    case "journey-explorer-block":
    case "comparison-block":
      return <ReferenceBlockSummary type={block.type} serviceContext={serviceContext} />;

    case "doctor-recommendation":
      return (
        <div className="space-y-2">
          <select
            value={data.doctorId || ""}
            onChange={(e) => set({ doctorId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select a doctor —</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          <textarea
            value={data.quote || ""}
            onChange={(e) => set({ quote: e.target.value })}
            placeholder="Recommendation / quote text"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      );

    case "suitability":
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          <textarea
            value={data.suitableFor || ""}
            onChange={(e) => set({ suitableFor: e.target.value })}
            placeholder={"Suitable for (one per line)"}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <textarea
            value={data.notSuitableFor || ""}
            onChange={(e) => set({ notSuitableFor: e.target.value })}
            placeholder={"Not suitable for (one per line)"}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      );

    case "expected-results":
    case "side-effects": {
      const fieldA = block.type === "expected-results" ? "timeframe" : "effect";
      const fieldB = block.type === "expected-results" ? "description" : "note";
      const placeholderA = block.type === "expected-results" ? "Timeframe (e.g. 2 weeks)" : "Effect (e.g. Mild redness)";
      const placeholderB = block.type === "expected-results" ? "What to expect" : "Note (optional)";
      const items: Array<Record<string, string>> = data.items?.length ? data.items : [{ [fieldA]: "", [fieldB]: "" }];
      const setItem = (i: number, patch: Record<string, string>) =>
        set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
      const addItem = () => set({ items: [...items, { [fieldA]: "", [fieldB]: "" }] });
      const removeItem = (i: number) => set({ items: items.filter((_, idx) => idx !== i) });
      return (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                <input
                  value={item[fieldA] || ""}
                  onChange={(e) => setItem(i, { [fieldA]: e.target.value })}
                  placeholder={placeholderA}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={item[fieldB] || ""}
                  onChange={(e) => setItem(i, { [fieldB]: e.target.value })}
                  placeholder={placeholderB}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0 mt-2">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add row</button>
        </div>
      );
    }

    case "related-link":
      return (
        <RelatedLinkEditForm
          data={data}
          set={set}
          relatedEntities={relatedEntities}
          ensureEntitiesLoaded={ensureEntitiesLoaded}
        />
      );

    default:
      return null;
  }
}

export default function ContentBlockEditor({
  blocks,
  onChange,
  sourceSystem,
  serviceContext,
}: {
  blocks: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
  sourceSystem: SourceSystem;
  serviceContext?: BlockServiceContext;
}) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateTarget, setTemplateTarget] = useState<ContentBlock | null>(null);
  const [imagePickerTarget, setImagePickerTarget] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<{ _id: string; name: string }[]>([]);

  // Only needed for the Doctor Recommendation block's picker — fetched once
  // regardless of sourceSystem, matching VideoForm's existing doctor-select
  // pattern (app/admin/components/VideoForm.tsx).
  useEffect(() => {
    fetch("/api/admin/doctors")
      .then((r) => r.json())
      .then((d) => { if (d.success) setDoctors(d.data ?? []); })
      .catch(() => {});
  }, []);

  // Related Link block's entity pickers — fetched lazily per type, only once
  // an admin actually selects that type (avoids loading all 6 admin lists
  // up front for content that may never use this block).
  const [relatedEntities, setRelatedEntities] = useState<Partial<Record<RelatedEntityType, RelatedEntityOption[]>>>({});
  const ensureEntitiesLoaded = (type: RelatedEntityType) => {
    if (!type || relatedEntities[type]) return;
    fetch(RELATED_ENTITY_ENDPOINTS[type])
      .then((r) => r.json())
      .then((d) => { if (d.success) setRelatedEntities((prev) => ({ ...prev, [type]: d.data ?? [] })); })
      .catch(() => {});
  };

  const availableTypes = CONTENT_BLOCK_TYPES.filter((t) => !t.availableIn || t.availableIn.includes(sourceSystem));

  const updateBlock = (id: string, data: Record<string, any>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, data } : b)));
  const toggleVisible = (id: string) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));
  const duplicate = (id: string) => {
    const src = blocks.find((b) => b.id === id);
    if (!src) return;
    const copy: ContentBlock = { ...src, id: `${src.type}-${Date.now()}`, data: JSON.parse(JSON.stringify(src.data)) };
    const idx = blocks.findIndex((b) => b.id === id);
    onChange([...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)]);
  };
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const addBlock = (type: ContentBlockType) => {
    onChange([...blocks, newBlock(type)]);
    setShowAddPicker(false);
  };
  const insertTemplate = (template: { type: string; data: Record<string, any> }) => {
    onChange([...blocks, { id: `${template.type}-${Date.now()}`, type: template.type, visible: true, data: { ...template.data } }]);
    setShowTemplates(false);
  };
  const saveAsTemplate = async (name: string) => {
    if (!templateTarget) return;
    const res = await fetch("/api/admin/section-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type: templateTarget.type,
        icon: CONTENT_BLOCK_TYPES.find((t) => t.type === templateTarget.type)?.icon || "",
        data: templateTarget.data,
        sourceSystem,
      }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || "Failed to save template");
  };

  return (
    <div className="space-y-3">
      {blocks.length > 0 && <ContentHealthCard blocks={blocks} hasFaq={!!serviceContext?.faq?.length} />}
      {blocks.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
          No content blocks yet — add your first one below.
        </div>
      ) : (
        <SectionList
          sections={blocks}
          onReorder={onChange}
          renderSection={(block, _index, dragControls) => {
            const def = CONTENT_BLOCK_TYPES.find((t) => t.type === block.type);
            return (
              <SectionCard
                section={block}
                label={def?.label || block.type}
                icon={def?.icon || "🧩"}
                dragControls={dragControls}
                defaultExpanded
                onToggleVisible={() => toggleVisible(block.id)}
                onDuplicate={() => duplicate(block.id)}
                onDelete={() => remove(block.id)}
                onSaveAsTemplate={() => setTemplateTarget(block)}
              >
                <BlockEditForm
                  block={block}
                  onChange={(data) => updateBlock(block.id, data)}
                  onPickImage={() => setImagePickerTarget(block.id)}
                  serviceContext={serviceContext}
                  doctors={doctors}
                  relatedEntities={relatedEntities}
                  ensureEntitiesLoaded={ensureEntitiesLoaded}
                  sourceSystem={sourceSystem}
                />
              </SectionCard>
            );
          }}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddPicker((s) => !s)}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-[#0B2560] hover:border-[#0B2560]/40 hover:bg-[#f6faff] transition"
          >
            <Plus size={14} /> Add Block
          </button>
          {showAddPicker && (
            <div className="absolute z-10 top-full mt-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 grid grid-cols-3 gap-1 w-72">
              {availableTypes.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => addBlock(t.type)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-50 transition text-center"
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-[10px] font-semibold text-gray-600">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTemplates((s) => !s)}
          className="flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-[#F5A623]/50 hover:bg-[#fffbf0] transition"
        >
          <LayoutTemplate size={14} /> Insert Saved Block
        </button>
      </div>

      {showTemplates && (
        <div className="bg-gray-50/60 rounded-2xl border border-gray-100 p-4">
          <TemplatePicker sourceSystem={sourceSystem} onInsert={insertTemplate} />
        </div>
      )}

      <SaveTemplateModal
        isOpen={!!templateTarget}
        onClose={() => setTemplateTarget(null)}
        onSave={saveAsTemplate}
        defaultName={templateTarget ? CONTENT_BLOCK_TYPES.find((t) => t.type === templateTarget.type)?.label : ""}
      />

      <MediaGalleryModal
        isOpen={!!imagePickerTarget}
        onClose={() => setImagePickerTarget(null)}
        onSelect={(img) => {
          if (!imagePickerTarget) return;
          const block = blocks.find((b) => b.id === imagePickerTarget);
          if (block) updateBlock(imagePickerTarget, { ...block.data, url: img.url, publicId: img.publicId });
        }}
      />
    </div>
  );
}
