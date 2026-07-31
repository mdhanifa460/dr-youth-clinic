import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { getSettings } from '@/app/models/Settings';
import { Video } from '@/app/models/Video';
import { generateText, getConfiguredProviderEnvKeyName, isConfiguredProviderReady } from '@/app/lib/ai';
import { parseClaudeJson } from '@/app/lib/ai/anthropic';
import { CLINICAL_AI_GUARDRAILS } from '@/app/lib/ai/clinicalGuardrails';

export const dynamic = 'force-dynamic';

// On-demand only — returns drafted FAQ pairs for the client to append to the
// video form's existing FAQ editor; the admin reviews/edits/removes before
// the normal Save.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  await connectDB();
  const settings = await getSettings();
  if (!settings.videoAI?.generateFaqEnabled) {
    return NextResponse.json({ success: false, message: 'AI FAQ generation is turned off — enable it in Settings → Video AI.' }, { status: 403 });
  }

  const video = await (Video as any).findById(params.id).lean();
  if (!video) return NextResponse.json({ success: false, message: 'Video not found' }, { status: 404 });

  if (!isConfiguredProviderReady()) {
    return NextResponse.json({ success: false, message: `${getConfiguredProviderEnvKeyName()} not set in .env.local` }, { status: 503 });
  }

  const context = [
    `Title: ${video.title}`,
    `Category: ${video.category}`,
    video.aiSummary ? `Summary: ${video.aiSummary}` : '',
    video.transcript ? `Transcript:\n${video.transcript.slice(0, 6000)}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `${CLINICAL_AI_GUARDRAILS}

You are drafting patient-facing FAQs for a clinic's educational video, to appear on its website.

${context}

Generate 5 frequently asked questions a patient would realistically ask after watching a video like this, with concise, hedged, accurate answers.

Return ONLY valid JSON, no explanation, no markdown:
{"faq": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]}`;

  try {
    // Cached (2h) — see generate-blog/route.ts.
    const raw = await generateText(prompt, { maxTokens: 900, cacheKey: "videos:generate-faq", cacheTtlSeconds: 7200 });
    const parsed = parseClaudeJson<{ faq: { question: string; answer: string }[] }>(raw);
    if (!Array.isArray(parsed.faq)) throw new Error('Unexpected AI response shape');
    return NextResponse.json({ success: true, data: parsed.faq.slice(0, 8) });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'FAQ generation failed' }, { status: 500 });
  }
}
