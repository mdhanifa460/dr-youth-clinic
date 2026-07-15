import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { stripHtml, plainTextToHtml } from "@/app/lib/contentBlocks/types";
import { callClaude } from "@/app/lib/ai/anthropic";

const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Medical Tone" — rewrites a single field (a paragraph block's html, or a
// plain-text field like Doctor Tip) in a more clinical, precise register.
// Sibling to the "Improve Writing" action in app/api/admin/content-blocks/
// improve/route.ts, which optimises for persuasive/marketing tone instead —
// kept as a separate route since the two prompts pull in different
// directions and shouldn't be merged into one togglable action.
export async function POST(req: NextRequest) {
  try {
    const { html, text, sourceSystem, context } = await req.json();
    const denied = await requirePermission(MODULE_BY_SYSTEM[sourceSystem] || "services", "full");
    if (denied) return denied;

    const plainText = html ? stripHtml(html) : (text || "").trim();
    if (!plainText) {
      return NextResponse.json({ success: false, message: "Nothing to rewrite — write something first" }, { status: 400 });
    }

    const prompt = `You are a medical editor for DR Youth Clinic, a premium dermatology and aesthetic clinic in India${context ? ` writing about "${context}"` : ""}.

Rewrite this text in a clear, clinically precise, reassuring tone appropriate for patient-facing medical content — do not invent claims, statistics, or medical details that aren't already there:

"${plainText.slice(0, 2000)}"

Return ONLY the rewritten text, no preamble, no quotes, no markdown formatting.`;

    const rewritten = await callClaude(prompt, 600);

    return NextResponse.json({
      success: true,
      data: html ? { html: plainTextToHtml(rewritten) } : { text: rewritten },
    });
  } catch (err: any) {
    const status = err.message === "AI not configured" ? 503 : 500;
    return NextResponse.json({ success: false, message: err.message || "Medical Tone rewrite failed" }, { status });
  }
}
