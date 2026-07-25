import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { getSettings } from '@/app/models/Settings';
import { Video } from '@/app/models/Video';
import { Blog } from '@/app/models/Blog';
import { callClaude, parseClaudeJson } from '@/app/lib/ai/anthropic';
import { CLINICAL_AI_GUARDRAILS } from '@/app/lib/ai/clinicalGuardrails';

export const dynamic = 'force-dynamic';

// Video's category enum doesn't match Blog's — map to the closest Blog
// category rather than leaving an invalid enum value (which would fail
// Blog's own schema validation on save).
const CATEGORY_MAP: Record<string, string> = {
  Hair: 'Hair Care', Skin: 'Skin Care', Laser: 'Laser', Botox: 'Aesthetics',
  Acne: 'Skin Care', PRP: 'Hair Care', GFC: 'Hair Care',
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function uniqueSlug(base: string) {
  let slug = base;
  let counter = 1;
  while (await (Blog as any).exists({ slug })) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

// Creates a real, unpublished Blog document (active: false) rather than a
// separate draft-storage concept — the admin reviews/edits it in the exact
// same Blog editor as any manually-written post, then publishes normally.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  await connectDB();
  const settings = await getSettings();
  if (!settings.videoAI?.generateBlogEnabled) {
    return NextResponse.json({ success: false, message: 'AI blog draft generation is turned off — enable it in Settings → Video AI.' }, { status: 403 });
  }

  const video = await (Video as any).findById(params.id).lean();
  if (!video) return NextResponse.json({ success: false, message: 'Video not found' }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, message: 'ANTHROPIC_API_KEY not set in .env.local' }, { status: 503 });
  }

  const context = [
    `Title: ${video.title}`,
    `Category: ${video.category}`,
    video.aiSummary ? `Summary: ${video.aiSummary}` : '',
    (video.keyTakeaways?.length) ? `Key takeaways: ${video.keyTakeaways.join('; ')}` : '',
    video.transcript ? `Transcript:\n${video.transcript.slice(0, 6000)}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `${CLINICAL_AI_GUARDRAILS}

You are drafting a Medical Knowledge Center blog article based on a clinic's educational video, for a dermatology/aesthetics clinic's website.

${context}

${video.transcript ? '' : 'No transcript is available — write a general educational article on this topic/category, clearly not a word-for-word account of the video, and avoid inventing specific clinical claims.'}

Return ONLY valid JSON, no explanation, no markdown:
{"title": "article title, under 70 characters", "excerpt": "1-2 sentence summary, under 200 characters", "body": "the full article in Markdown, 400-700 words, with ## subheadings"}`;

  try {
    const raw = await callClaude(prompt, 2000);
    const parsed = parseClaudeJson<{ title: string; excerpt: string; body: string }>(raw);
    if (!parsed.title || !parsed.body) throw new Error('Unexpected AI response shape');

    const slug = await uniqueSlug(slugify(parsed.title));
    const blog = await Blog.create({
      title: parsed.title,
      slug,
      excerpt: (parsed.excerpt || '').slice(0, 300),
      body: parsed.body,
      category: CATEGORY_MAP[video.category] || 'General',
      tags: video.tags || [],
      active: false,
      featured: false,
      sourceVideoId: video._id,
    });

    return NextResponse.json({ success: true, data: { _id: blog._id, slug: blog.slug } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Blog draft generation failed' }, { status: 500 });
  }
}
