"use client";

import { useMemo } from "react";
import { computeArticleIntelligence, type ArticlePostLike } from "@/app/lib/contentBlocks/articleIntelligence";

// Visual convention matches ContentHealthCard.tsx (score badge + pass/fail
// grid) — but this checks whole-article CMS completeness (doctor review,
// sources, schema, local SEO), not block-content quality.
export default function ArticleIntelligenceCard({ post }: { post: ArticlePostLike }) {
  const { score, checks } = useMemo(() => computeArticleIntelligence(post), [post]);
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg = score >= 80 ? "bg-green-50 border-green-100" : score >= 50 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${scoreBg}`}>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Article Intelligence</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{passedCount}/{checks.length} checks passed</p>
        </div>
        <p className={`text-lg font-extrabold ${scoreColor}`}>{score}/100</p>
      </div>
      <div className="p-4 bg-white grid sm:grid-cols-2 gap-2">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg p-2.5 border text-xs ${c.passed ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"}`}
          >
            <p className={`font-semibold text-[10px] ${c.passed ? "text-green-600" : "text-amber-600"}`}>
              {c.passed ? "✓" : "⚠"} {c.label}
            </p>
            <p className="text-gray-500 mt-0.5">{c.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
