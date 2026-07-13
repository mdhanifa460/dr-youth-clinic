import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { stripHtml, plainTextToHtml } from "@/app/lib/contentBlocks/types";

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
    }

    const prompt = `You are a copywriter for DR Youth Clinic, a premium skin, hair, and laser treatment clinic in India${context ? ` writing about "${context}"` : ""}.

Improve the clarity, flow, and persuasiveness of this paragraph without changing its factual meaning — do not invent claims, statistics, or medical details that aren't already there:

"${plainText.slice(0, 2000)}"

Return ONLY the improved paragraph text, no preamble, no quotes, no markdown formatting.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const improved = (data.content?.[0]?.text ?? "").trim();
    if (!improved) throw new Error("Empty AI response");

    return NextResponse.json({ success: true, data: { html: plainTextToHtml(improved) } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Improve Writing failed" }, { status: 500 });
  }
}
