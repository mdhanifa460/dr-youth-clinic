import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { callClaude, parseClaudeJson } from "@/app/lib/ai/anthropic";

const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Generate FAQ" — proposes a freestanding FAQ block ("faq" type, distinct
// from Service's live-data "faq-block" reference — see
// app/lib/contentBlocks/types.ts). Also feeds the article's FAQPage schema
// and the Article Intelligence "FAQ presence" check once inserted.
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
${context ? `Article content so far:\n"""\n${context.slice(0, 6000)}\n"""` : "(No content written yet — write general, medically responsible FAQs for this topic.)"}

Write 4-6 frequently asked questions a patient researching this topic would have, with concise answers (2-3 sentences each) — do not invent prices, statistics, or medical claims not already supported by the content above; keep answers general and safe where specifics aren't given.

Return ONLY valid JSON, no markdown: {"items": [{"question": "...", "answer": "..."}]}`;

    const text = await callClaude(prompt, 900);
    const parsed = parseClaudeJson<{ items: Array<{ question: string; answer: string }> }>(text);
    const items = Array.isArray(parsed.items) ? parsed.items.filter((i) => i?.question?.trim() && i?.answer?.trim()) : [];
    if (items.length === 0) throw new Error("AI didn't return usable FAQ items");

    return NextResponse.json({ success: true, data: { items: items.slice(0, 8) } });
  } catch (err: any) {
    const status = err.message === "AI not configured" ? 503 : 500;
    return NextResponse.json({ success: false, message: err.message || "Generate FAQ failed" }, { status });
  }
}
