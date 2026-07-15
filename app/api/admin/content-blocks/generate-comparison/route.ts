import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { callClaude, parseClaudeJson } from "@/app/lib/ai/anthropic";

const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Generate Comparison" — proposes a Comparison Table block
// (freestanding "comparison-table" type, distinct from Service's live-data
// "comparison-block" reference — see app/lib/contentBlocks/types.ts).
export async function POST(req: NextRequest) {
  try {
    const { topic, context, sourceSystem } = await req.json();
    const denied = await requirePermission(MODULE_BY_SYSTEM[sourceSystem] || "services", "full");
    if (denied) return denied;

    if (!topic?.trim() && !context?.trim()) {
      return NextResponse.json({ success: false, message: "Add a title or some content first" }, { status: 400 });
    }

    const prompt = `You are a medical content editor for DR Youth Clinic, a premium dermatology and aesthetic clinic in India.

Article topic: "${topic || "Untitled"}"
${context ? `Article content so far:\n"""\n${context.slice(0, 6000)}\n"""` : "(No content written yet — infer a sensible comparison for this topic, e.g. comparing 2-3 related treatment options.)"}

Propose a short comparison table relevant to this article (e.g. comparing treatment options, or before/after criteria) — 2-4 columns and 3-5 rows. Do not invent prices or medical claims not already supported by the content above; use short factual labels (e.g. "Downtime", "Sessions needed") rather than numbers you're not given.

Return ONLY valid JSON, no markdown: {"headers": ["...", "..."], "rows": [{"label": "...", "values": ["...", "..."]}]}`;

    const text = await callClaude(prompt, 700);
    const parsed = parseClaudeJson<{ headers: string[]; rows: Array<{ label: string; values: string[] }> }>(text);
    const headers = Array.isArray(parsed.headers) ? parsed.headers.filter((h) => typeof h === "string") : [];
    const rows = Array.isArray(parsed.rows) ? parsed.rows.filter((r) => r?.label?.trim()) : [];
    if (headers.length === 0 || rows.length === 0) throw new Error("AI didn't return a usable comparison table");

    return NextResponse.json({ success: true, data: { headers: headers.slice(0, 5), rows: rows.slice(0, 6) } });
  } catch (err: any) {
    const status = err.message === "AI not configured" ? 503 : 500;
    return NextResponse.json({ success: false, message: err.message || "Generate Comparison failed" }, { status });
  }
}
