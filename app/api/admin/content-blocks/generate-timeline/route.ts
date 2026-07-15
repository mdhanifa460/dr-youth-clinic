import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import type { AdminModule } from "@/app/lib/permissions";
import { callClaude, parseClaudeJson } from "@/app/lib/ai/anthropic";

const MODULE_BY_SYSTEM: Record<string, AdminModule> = {
  "content-block-service": "services",
  "content-block-blog": "blog",
};

// "✨ Generate Timeline" — proposes a Timeline block. Shared by both the
// Timeline and Recovery block types (see app/lib/contentBlocks/types.ts) —
// the Recovery block's admin form remaps {label,description,duration} to its
// own {phase,description,icon} fields client-side rather than needing a
// second, near-identical route.
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
${context ? `Article content so far:\n"""\n${context.slice(0, 6000)}\n"""` : "(No content written yet — write a general, medically responsible timeline for this topic.)"}

Write a 3-6 step timeline relevant to this article (e.g. treatment/recovery stages) — for each step give a short label, a one-sentence description, and an approximate duration label (e.g. "Day 1", "Week 2-4") only if it can be reasonably inferred; otherwise leave duration empty. Do not invent medical claims not already supported by the content above.

Return ONLY valid JSON, no markdown: {"steps": [{"label": "...", "description": "...", "duration": "..."}]}`;

    const text = await callClaude(prompt, 700);
    const parsed = parseClaudeJson<{ steps: Array<{ label: string; description?: string; duration?: string }> }>(text);
    const steps = Array.isArray(parsed.steps) ? parsed.steps.filter((s) => s?.label?.trim()) : [];
    if (steps.length === 0) throw new Error("AI didn't return usable timeline steps");

    return NextResponse.json({ success: true, data: { steps: steps.slice(0, 8) } });
  } catch (err: any) {
    const status = err.message === "AI not configured" ? 503 : 500;
    return NextResponse.json({ success: false, message: err.message || "Generate Timeline failed" }, { status });
  }
}
