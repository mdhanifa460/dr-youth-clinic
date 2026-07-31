import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { getSettings } from '@/app/models/Settings';
import { Video } from '@/app/models/Video';
import { Story } from '@/app/models/Story';
import { StoryType } from '@/app/models/StoryType';
import { generateText, getConfiguredProviderEnvKeyName, isConfiguredProviderReady } from '@/app/lib/ai';
import { parseClaudeJson } from '@/app/lib/ai/anthropic';
import { CLINICAL_AI_GUARDRAILS } from '@/app/lib/ai/clinicalGuardrails';

export const dynamic = 'force-dynamic';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Creates a real, draft Story document (status: 'draft') with a couple of
// pre-filled slides — the admin opens it in the normal Story builder to add
// images/more slides and publish, same review workflow as the Blog draft.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  await connectDB();
  const settings = await getSettings();
  if (!settings.videoAI?.generateStoryEnabled) {
    return NextResponse.json({ success: false, message: 'AI web story draft generation is turned off — enable it in Settings → Video AI.' }, { status: 403 });
  }

  const video = await (Video as any).findById(params.id).lean();
  if (!video) return NextResponse.json({ success: false, message: 'Video not found' }, { status: 404 });

  // Story.storyType is a required reference — a generated draft needs one
  // to exist already; there's no sensible default to invent on the fly.
  const storyType = await (StoryType as any).findOne({}).lean();
  if (!storyType) {
    return NextResponse.json({ success: false, message: 'Create at least one Story Type first (Admin → Web Stories → Story Types) before generating a story draft.' }, { status: 400 });
  }

  if (!isConfiguredProviderReady()) {
    return NextResponse.json({ success: false, message: `${getConfiguredProviderEnvKeyName()} not set in .env.local` }, { status: 503 });
  }

  const context = [
    `Title: ${video.title}`,
    `Category: ${video.category}`,
    video.aiSummary ? `Summary: ${video.aiSummary}` : '',
    video.transcript ? `Transcript:\n${video.transcript.slice(0, 4000)}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `${CLINICAL_AI_GUARDRAILS}

You are drafting a short Web Story (a swipeable, visual mobile format, like 3-4 slides) based on a clinic's educational video.

${context}

Return ONLY valid JSON, no explanation, no markdown:
{"title": "story title, under 60 characters", "description": "1 sentence description", "slides": [{"title": "slide 1 headline", "body": "1-2 sentence slide text"}, {"title": "slide 2 headline", "body": "1-2 sentence slide text"}, {"title": "slide 3 headline", "body": "1-2 sentence slide text"}]}`;

  try {
    // Cached (2h) — see generate-blog/route.ts.
    const raw = await generateText(prompt, { maxTokens: 900, cacheKey: "videos:generate-story", cacheTtlSeconds: 7200 });
    const parsed = parseClaudeJson<{ title: string; description: string; slides: { title: string; body: string }[] }>(raw);
    if (!parsed.title || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error('Unexpected AI response shape');
    }

    const slides = parsed.slides.slice(0, 5).map((s, i) => ({
      id: uid(),
      order: i,
      background: { type: 'color' as const, color: i % 2 === 0 ? '#0B2560' : '#1a4a8a' },
      overlay: true,
      elements: [
        { id: uid(), type: 'title' as const, visible: true, data: { text: s.title } },
        { id: uid(), type: 'description' as const, visible: true, data: { text: s.body } },
      ],
      duration: 5,
      transition: 'slide' as const,
      muted: true,
    }));

    const story = await Story.create({
      title: parsed.title,
      description: parsed.description || '',
      storyType: storyType._id,
      tags: video.tags || [],
      slides,
      status: 'draft',
      sourceVideoId: video._id,
    });

    return NextResponse.json({ success: true, data: { _id: story._id, slug: story.slug } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Story draft generation failed' }, { status: 500 });
  }
}
