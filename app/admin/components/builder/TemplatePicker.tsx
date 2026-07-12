"use client";

import { useState, useEffect } from "react";
import { Loader, Trash2, LayoutTemplate } from "lucide-react";

interface SavedTemplate {
  _id: string;
  name: string;
  type: string;
  icon: string;
  data: Record<string, any>;
}

export default function TemplatePicker({
  sourceSystem,
  onInsert,
}: {
  sourceSystem: "landing-page" | "homepage" | "about";
  onInsert: (template: SavedTemplate) => void;
}) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/section-templates?sourceSystem=${sourceSystem}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.success ? d.data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [sourceSystem]);

  const remove = async (id: string) => {
    await fetch(`/api/admin/section-templates/${id}`, { method: "DELETE" }).catch(() => {});
    setTemplates((prev) => prev.filter((t) => t._id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader size={18} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <LayoutTemplate size={22} className="mx-auto mb-2 text-gray-300" />
        No saved templates yet — use "Save as Template" on any section to build your library.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {templates.map((t) => (
        <div key={t._id} className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl hover:border-[#0B2560]/30 transition group">
          <span className="text-lg shrink-0">{t.icon || "🧩"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#0B2560] truncate">{t.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{t.type}</p>
          </div>
          <button
            type="button"
            onClick={() => onInsert(t)}
            className="text-[10px] font-bold text-white bg-[#0B2560] px-2.5 py-1.5 rounded-lg hover:bg-[#0d2d73] transition shrink-0"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={() => remove(t._id)}
            title="Delete template"
            className="text-gray-300 hover:text-red-500 transition shrink-0 opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
