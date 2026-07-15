import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { callClaude, parseClaudeJson } from "@/app/lib/ai/anthropic";

const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Generate Procedure Steps" — proposes a Procedure block.
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
${context ? `Article content so far:\n"""\n${context.slice(0, 6000)}\n"""` : "(No content written yet — write a general, medically responsible procedure outline for this topic.)"}

Write 3-6 procedure steps relevant to this article (e.g. "how it works" / "what happens during treatment") — for each step give a short title and a one-sentence description. Do not invent medical claims not already supported by the content above.

Return ONLY valid JSON, no markdown: {"steps": [{"title": "...", "description": "..."}]}`;

    const text = await callClaude(prompt, 600);
    const parsed = parseClaudeJson<{ steps: Array<{ title: string; description?: string }> }>(text);
    const steps = Array.isArray(parsed.steps) ? parsed.steps.filter((s) => s?.title?.trim()) : [];
    if (steps.length === 0) throw new Error("AI didn't return usable procedure steps");

    return NextResponse.json({
      success: true,
      data: { steps: steps.slice(0, 8).map((s) => ({ ...s, icon: "" })) },
    });
  } catch (err: any) {
    const status = err.message === "AI not configured" ? 503 : 500;
    return NextResponse.json({ success: false, message: err.message || "Generate Procedure Steps failed" }, { status });
  }
}
