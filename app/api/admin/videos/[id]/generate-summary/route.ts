import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { getSettings } from '@/app/models/Settings';
import { Video } from '@/app/models/Video';
import { callClaude, parseClaudeJson } from '@/app/lib/ai/anthropic';
import { CLINICAL_AI_GUARDRAILS } from '@/app/lib/ai/clinicalGuardrails';

export const dynamic = 'force-dynamic';

// On-demand only (Level 2) — never called automatically. Returns the result
// to the client for review; nothing is persisted here, the admin still has
// to click the video form's own Save button, same as every other field.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  await connectDB();
  const settings = await getSettings();
  if (!settings.videoAI?.generateSummaryEnabled) {
    return NextResponse.json({ success: false, message: 'AI summary generation is turned off — enable it in Settings → Video AI.' }, { status: 403 });
  }

  const video = await (Video as any).findById(params.id).lean();
  if (!video) return NextResponse.json({ success: false, message: 'Video not found' }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, message: 'ANTHROPIC_API_KEY not set in .env.local' }, { status: 503 });
  }

  const chapterText = (video.chapters || []).map((c: any) => c.label).filter(Boolean).join(', ');
  const context = [
    `Title: ${video.title}`,
    `Category: ${video.category}`,
    video.duration ? `Duration: ${video.duration}` : '',
    chapterText ? `Chapters: ${chapterText}` : '',
    video.transcript ? `Transcript:\n${video.transcript.slice(0, 6000)}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `${CLINICAL_AI_GUARDRAILS}

You are summarizing a clinic's educational YouTube video for its website.

${context}

${video.transcript ? '' : "No transcript is available — base the summary on the title, category, and chapters only, and keep it general rather than inventing specific claims the video may not make."}

Return ONLY valid JSON, no explanation, no markdown:
{"summary": "2-3 sentence summary of what this video covers", "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4"]}`;

  try {
    const raw = await callClaude(prompt, 500);
    const parsed = parseClaudeJson<{ summary: string; keyTakeaways: string[] }>(raw);
    if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.keyTakeaways)) {
      throw new Error('Unexpected AI response shape');
    }
    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Summary generation failed' }, { status: 500 });
  }
}
