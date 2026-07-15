import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { callClaude, parseClaudeJson } from "@/app/lib/ai/anthropic";

const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Generate Benefits" — proposes a freestanding Benefits block ("benefits"
// type, distinct from Service's live-data "benefits-block" reference — see
// app/lib/contentBlocks/types.ts).
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
${context ? `Article content so far:\n"""\n${context.slice(0, 6000)}\n"""` : "(No content written yet — write general, medically responsible benefits for this topic.)"}

Write 3-5 key benefits relevant to this article, each a short title (3-6 words) and a one-sentence description, plus a single emoji icon per benefit — do not invent statistics or medical claims not already supported by the content above.

Return ONLY valid JSON, no markdown: {"items": [{"icon": "⚡", "title": "...", "description": "..."}]}`;

    const text = await callClaude(prompt, 700);
    const parsed = parseClaudeJson<{ items: Array<{ icon?: string; title: string; description?: string }> }>(text);
    const items = Array.isArray(parsed.items) ? parsed.items.filter((i) => i?.title?.trim()) : [];
    if (items.length === 0) throw new Error("AI didn't return usable benefits");

    return NextResponse.json({
      success: true,
      data: { items: items.slice(0, 6).map((i) => ({ icon: i.icon || "⚡", title: i.title, description: i.description || "" })) },
    });
  } catch (err: any) {
    const status = err.message === "AI not configured" ? 503 : 500;
    return NextResponse.json({ success: false, message: err.message || "Generate Benefits failed" }, { status });
  }
}
