import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { stripHtml, plainTextToHtml } from "@/app/lib/contentBlocks/types";
import { callClaude } from "@/app/lib/ai/anthropic";

// Same sourceSystem -> module mapping as app/api/admin/section-templates/route.ts.
const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Improve Writing" for the Content Block Builder's Paragraph block —
// on-demand only, one paragraph at a time. Follows the same hand-rolled
// fetch-to-Claude pattern as every other AI route in this codebase (e.g.
// app/api/admin/quiz/summarize-note/route.ts) rather than introducing a new
// SDK dependency or client wrapper.
export async function POST(req: NextRequest) {
  try {
    const { html, sourceSystem, context } = await req.json();
    const denied = await requirePermission(MODULE_BY_SYSTEM[sourceSystem] || "services", "full");
    if (denied) return denied;

    const plainText = stripHtml(html || "");
    if (!plainText) {
      return NextResponse.json({ success: false, message: "Nothing to improve — write something first" }, { status: 400 });
    }

    const prompt = `You are a copywriter for DR Youth Clinic, a premium skin, hair, and laser treatment clinic in India${context ? ` writing about "${context}"` : ""}.

Improve the clarity, flow, and persuasiveness of this paragraph without changing its factual meaning — do not invent claims, statistics, or medical details that aren't already there:

"${plainText.slice(0, 2000)}"

Return ONLY the improved paragraph text, no preamble, no quotes, no markdown formatting.`;

    const improved = await callClaude(prompt, 600);

    return NextResponse.json({ success: true, data: { html: plainTextToHtml(improved) } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Improve Writing failed" }, { status: 500 });
  }
}
