"use client";

import { useState } from "react";
import BlockRenderer from "@/app/components/contentblocks/BlockRenderer";
import type { ContentBlock, BlockServiceContext } from "@/app/lib/contentBlocks/types";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_WIDTHS: Record<Viewport, string> = { desktop: "100%", tablet: "768px", mobile: "375px" };
const VIEWPORT_LABELS: Record<Viewport, string> = { desktop: "🖥️ Desktop", tablet: "📱 Tablet", mobile: "📱 Mobile" };

// Live preview — reuses the exact same BlockRenderer the public pages render
// with, just wrapped in a width-constrained frame. Deliberately not a second
// rendering system: whatever this shows is exactly what ships.
export default function BlockPreviewPanel({
  blocks,
  serviceContext,
}: {
  blocks: ContentBlock[];
  serviceContext?: BlockServiceContext;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-gray-100 flex-wrap">
        <div className="flex gap-1">
          {(Object.keys(VIEWPORT_LABELS) as Viewport[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewport(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewport === v ? "bg-[#0B2560] text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {VIEWPORT_LABELS[v]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 italic">Related Link, Doctor Recommendation, Video, and Comparison blocks resolve after saving — they show empty here.</p>
      </div>
      <div className="p-6 flex justify-center overflow-x-auto">
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-[width] duration-200"
          style={{ width: VIEWPORT_WIDTHS[viewport], maxWidth: "100%" }}
        >
          {blocks.length > 0 ? (
            <BlockRenderer blocks={blocks} serviceContext={serviceContext} />
          ) : (
            <p className="text-gray-300 text-sm text-center py-10">Nothing to preview yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
