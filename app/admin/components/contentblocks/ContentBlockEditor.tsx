"use client";

import { useState } from "react";
import { Plus, LayoutTemplate } from "lucide-react";
import SectionList from "@/app/admin/components/builder/SectionList";
import SectionCard from "@/app/admin/components/builder/SectionCard";
import SaveTemplateModal from "@/app/admin/components/builder/SaveTemplateModal";
import TemplatePicker from "@/app/admin/components/builder/TemplatePicker";
import MediaGalleryModal from "@/app/admin/components/MediaGalleryModal";
import { CONTENT_BLOCK_TYPES, newBlock, type ContentBlock, type ContentBlockType } from "@/app/lib/contentBlocks/types";
import RichTextEditor from "./RichTextEditor";

type SourceSystem = "content-block-service" | "content-block-blog";

function BlockEditForm({
  block,
  onChange,
  onPickImage,
}: {
  block: ContentBlock;
  onChange: (data: Record<string, any>) => void;
  onPickImage: () => void;
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
      return <RichTextEditor html={data.html || ""} onChange={(html) => set({ html })} />;

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

    default:
      return null;
  }
}

export default function ContentBlockEditor({
  blocks,
  onChange,
  sourceSystem,
}: {
  blocks: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
  sourceSystem: SourceSystem;
}) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateTarget, setTemplateTarget] = useState<ContentBlock | null>(null);
  const [imagePickerTarget, setImagePickerTarget] = useState<string | null>(null);

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
              {CONTENT_BLOCK_TYPES.map((t) => (
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
