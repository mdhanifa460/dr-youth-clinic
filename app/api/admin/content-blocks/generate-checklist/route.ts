import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { callClaude, parseClaudeJson } from "@/app/lib/ai/anthropic";

const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Generate Checklist" — proposes a Checklist block (see
// app/lib/contentBlocks/types.ts), e.g. "Before your appointment" style lists.
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
${context ? `Article content so far:\n"""\n${context.slice(0, 6000)}\n"""` : "(No content written yet — write a general, medically responsible checklist for this topic.)"}

Write a short checklist title and 4-7 practical checklist items relevant to this article (e.g. preparation steps, things to bring, aftercare reminders) — do not invent medical claims not already supported by the content above.

Return ONLY valid JSON, no markdown: {"title": "...", "items": ["...", "..."]}`;

    const text = await callClaude(prompt, 500);
    const parsed = parseClaudeJson<{ title?: string; items: string[] }>(text);
    const items = Array.isArray(parsed.items) ? parsed.items.filter((i) => typeof i === "string" && i.trim()) : [];
    if (items.length === 0) throw new Error("AI didn't return usable checklist items");

    return NextResponse.json({
      success: true,
      data: { title: parsed.title || "", items: items.slice(0, 10).map((text) => ({ text, checked: false })) },
    });
  } catch (err: any) {
    const status = err.message === "AI not configured" ? 503 : 500;
    return NextResponse.json({ success: false, message: err.message || "Generate Checklist failed" }, { status });
  }
}
