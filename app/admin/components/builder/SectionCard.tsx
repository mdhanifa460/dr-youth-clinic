"use client";

import { useState } from "react";
import type { DragControls } from "framer-motion";
import { GripVertical, ChevronDown, Eye, EyeOff, Copy, Trash2, BookmarkPlus } from "lucide-react";
import type { BuilderSection } from "@/app/lib/pageBuilder/types";
import { previewText } from "@/app/lib/pageBuilder/types";

export default function SectionCard({
  section,
  label,
  icon,
  dragControls,
  defaultExpanded = false,
  onToggleVisible,
  onDuplicate,
  onDelete,
  onSaveAsTemplate,
  children,
}: {
  section: BuilderSection;
  label: string;
  icon: string;
  dragControls: DragControls;
  defaultExpanded?: boolean;
  onToggleVisible: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSaveAsTemplate?: () => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const preview = previewText(section.data);

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
        section.visible ? "border-gray-100" : "border-gray-100 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <span className="text-xl shrink-0">{icon}</span>

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 min-w-0 text-left flex items-center gap-2"
        >
          <span className="font-bold text-[#0B2560] text-sm shrink-0">{label}</span>
          {preview && <span className="text-xs text-gray-400 truncate">— {preview}</span>}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleVisible}
            title={section.visible ? "Hide section" : "Show section"}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
              section.visible ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-300 hover:bg-gray-50"
            }`}
          >
            {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              title="Duplicate"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-[#0B2560] transition"
            >
              <Copy size={14} />
            </button>
          )}
          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={onSaveAsTemplate}
              title="Save as Template"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-[#F5A623] transition"
            >
              <BookmarkPlus size={14} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse" : "Edit"}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 transition"
          >
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 py-5 bg-gray-50/40">{children}</div>
      )}
    </div>
  );
}
