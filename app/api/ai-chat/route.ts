import { NextRequest } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import { getSettings } from '@/app/models/Settings';
import { embedQuery } from '@/app/lib/rag/EmbeddingService';
import { vectorSearchKnowledgeBase } from '@/app/lib/rag/VectorSearchService';
import { CLINICAL_AI_GUARDRAILS } from '@/app/lib/ai/clinicalGuardrails';
import { anthropicStreamRequest } from '@/app/lib/ai/anthropic';
import { scoreHitsToCards, type RecommendationType } from '@/app/lib/rag/RecommendationService';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Restores the visible thread when a visitor navigates between pages —
// sessionId persists in localStorage, but React state doesn't survive a
// full page load, so the widget re-fetches its own history on mount.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return Response.json({ success: false, message: 'sessionId is required' }, { status: 400 });

  try {
    await connectDB();
    const conversation = await (Conversation as any).findOne({ sessionId }).select('messages').lean();
    return Response.json({ success: true, messages: conversation?.messages ?? [] });
  } catch {
    return Response.json({ success: true, messages: [] });
  }
}

const CARD_TYPES: RecommendationType[] = ['doctor', 'service', 'offer', 'result'];
const MAX_HISTORY_MESSAGES = 8; // last 4 turns of context
const MAX_STORED_MESSAGES = 60; // per conversation, oldest trimmed beyond this

function ndjson(obj: unknown) {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

// Highest-priority enabled rule whose matchKeywords substring-match the
// message wins (case-insensitive) — ties break by array order.
function matchRule<T extends { enabled: boolean; matchKeywords: string[]; priority: number }>(
  rules: T[] | undefined, message: string
): T | null {
  if (!rules?.length) return null;
  const lower = message.toLowerCase();
  const matches = rules.filter(r => r.enabled && r.matchKeywords?.some(k => k && lower.includes(k.toLowerCase())));
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (b.priority > a.priority ? b : a));
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ai-chat:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Invalid request body' }), { status: 400 });
  }

  const sessionId = String(body?.sessionId || '').slice(0, 100);
  const message = String(body?.message || '').trim().slice(0, 500);
  const location = String(body?.location || '').slice(0, 30);
  if (!sessionId || !message) {
    return new Response(JSON.stringify({ success: false, message: 'sessionId and message are required' }), { status: 400 });
  }

  await connectDB();
  const settings = await getSettings();
  const aiConfig = settings.ai;

  if (!aiConfig?.enabled) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(ndjson({ type: 'disabled' }));
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  let conversation = await Conversation.findOne({ sessionId } as any);
  if (!conversation) {
    conversation = await Conversation.create({ sessionId, location, messages: [] });
  }

  const priorMessages = conversation.messages.slice(-MAX_HISTORY_MESSAGES).map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  conversation.messages.push({ role: 'user', content: message, createdAt: new Date() });

  // Retrieval — one embedding + one vector search serves both the grounding
  // context for the text answer AND the recommendation cards, rather than
  // paying for two separate calls per turn.
  let contextBlock = '';
  let cards: any[] = [];
  try {
    const embedding = await embedQuery(message);
    const rawHits = await vectorSearchKnowledgeBase(embedding, { limit: 6, location: location || undefined });
    // admin_note documents are internal-only (e.g. staff SOPs) — never let them
    // leak into a patient-facing answer just because they scored well semantically.
    const hits = rawHits.filter((h: any) => !(h.sourceType === 'document' && h.category === 'admin_note'));
    contextBlock = hits
      .map((h: any) => `[${h.sourceType}] ${h.title}\n${String(h.text || '').slice(0, 500)}${h.url ? `\n(link: ${h.url})` : ''}`)
      .join('\n\n---\n\n');

    if (aiConfig.enableRecommendations) {
      const matchedRecRule = matchRule(aiConfig.recommendationRules, message);
      const types = (matchedRecRule?.preferredTypes?.length ? matchedRecRule.preferredTypes : CARD_TYPES) as RecommendationType[];
      const minScore = matchedRecRule?.minScore;
      cards = scoreHitsToCards(hits, { types, minScore })
        .slice(0, 3)
        .map((c) => ({ type: c.type, id: c.sourceId, title: c.title, subtitle: c.subtitle, href: c.href }));
    }
  } catch (e) {
    console.error('[ai-chat] retrieval failed', e);
    // Fall through with no context — the model still answers from its
    // system prompt/guardrails, just without grounded facts this turn.
  }

  const quickActionsText = (aiConfig.quickActions || [])
    .map((a: any) => `${a.label} -> ${a.action}`).join(', ');

  const matchedEscalationRule = matchRule(aiConfig.escalationRules, message);

  const systemPrompt = [
    CLINICAL_AI_GUARDRAILS,
    aiConfig.systemPrompt,
    contextBlock ? `Context from the clinic's knowledge base (ground your answer in this; if the answer isn't here, say you're not certain and suggest booking a consultation):\n\n${contextBlock}` : '',
    contextBlock && aiConfig.enableRecommendations && aiConfig.recommendationPrompt ? aiConfig.recommendationPrompt : '',
    quickActionsText ? `Available quick actions you may mention: ${quickActionsText}.` : '',
    aiConfig.enableWhatsappHandoff ? 'If the patient wants a human, offer to continue on WhatsApp.' : '',
    matchedEscalationRule ? `This message touches a sensitive topic the clinic wants handled carefully: ${matchedEscalationRule.message}` : '',
  ].filter(Boolean).join('\n\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(ndjson({ type: 'error', message: 'AI service is not configured.' }));
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const upstream = await anthropicStreamRequest({
    model: aiConfig.model || 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    temperature: aiConfig.temperature ?? 0.4,
    system: systemPrompt,
    messages: [...priorMessages, { role: 'user', content: message }],
  });

  if (!upstream.ok) {
    console.error('[ai-chat] Anthropic error', upstream.status, await upstream.clone().text());
  }
  if (!upstream.ok || !upstream.body) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(ndjson({ type: 'error', message: 'AI service is temporarily unavailable — please try again.' }));
        controller.close();
      },
    });
    // Still persist the user's message so it's not lost from history.
    await conversation.save().catch(() => {});
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const outgoing = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const evt of events) {
            const dataLine = evt.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const jsonStr = dataLine.slice(5).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const text = parsed.delta.text as string;
                fullText += text;
                controller.enqueue(ndjson({ type: 'delta', text }));
              }
            } catch {
              // Skip unparseable SSE fragments (e.g. ping events) rather than aborting the stream.
            }
          }
        }
      } finally {
        const assistantCreatedAt = new Date();
        conversation.messages.push({ role: 'assistant', content: fullText || '(no response)', cards, escalated: !!matchedEscalationRule, createdAt: assistantCreatedAt });
        if (conversation.messages.length > MAX_STORED_MESSAGES) {
          conversation.messages = conversation.messages.slice(-MAX_STORED_MESSAGES);
        }
        conversation.lastMessageAt = new Date();
        await conversation.save().catch((e: any) => console.error('[ai-chat] failed to persist conversation', e));

        controller.enqueue(ndjson({ type: 'cards', cards }));
        controller.enqueue(ndjson({ type: 'meta', createdAt: assistantCreatedAt.toISOString() }));
        controller.enqueue(ndjson({ type: 'done' }));
        controller.close();
      }
    },
  });

  return new Response(outgoing, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
