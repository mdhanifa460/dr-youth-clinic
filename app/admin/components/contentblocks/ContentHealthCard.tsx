"use client";

import { useMemo } from "react";
import { computeContentHealth } from "@/app/lib/contentBlocks/health";
import type { ContentBlock } from "@/app/lib/contentBlocks/types";

// Visual convention (signal grid, ✓/pass-fail cards) matches
// app/admin/components/SeoPreviewCard.tsx's existing checklist style.
export default function ContentHealthCard({ blocks, hasFaq }: { blocks: ContentBlock[]; hasFaq?: boolean }) {
  const { score, checks } = useMemo(() => computeContentHealth(blocks, { hasFaq }), [blocks, hasFaq]);
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg = score >= 80 ? "bg-green-50 border-green-100" : score >= 50 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${scoreBg}`}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Content Health</p>
        <p className={`text-lg font-extrabold ${scoreColor}`}>{score}%</p>
      </div>
      <div className="p-4 bg-white grid sm:grid-cols-2 gap-2">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg p-2.5 border text-xs ${
              c.na ? "bg-gray-50 border-gray-100" : c.passed ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"
            }`}
          >
            <p className={`font-semibold text-[10px] ${c.na ? "text-gray-400" : c.passed ? "text-green-600" : "text-amber-600"}`}>
              {c.na ? "—" : c.passed ? "✓" : "⚠"} {c.label}
            </p>
            <p className="text-gray-500 mt-0.5">{c.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
