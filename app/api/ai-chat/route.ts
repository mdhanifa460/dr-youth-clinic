import { NextRequest } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Conversation } from '@/app/models/Conversation';
import { Faq } from '@/app/models/Faq';
import { getSettings } from '@/app/models/Settings';
import { embedQuery } from '@/app/lib/rag/EmbeddingService';
import { vectorSearchKnowledgeBase } from '@/app/lib/rag/VectorSearchService';
import { findBestPredefinedMatch } from '@/app/lib/rag/predefinedFaqMatch';
import { CLINICAL_AI_GUARDRAILS } from '@/app/lib/ai/clinicalGuardrails';
import { generateChatStream, isConfiguredProviderReady } from '@/app/lib/ai';
import { scoreHitsToCards, type RecommendationType } from '@/app/lib/rag/RecommendationService';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { canonicalizeLocation } from '@/app/lib/locationNormalize';
import { getBranchAvailability } from '@/app/lib/availability';
import { getDoctorAvailability } from '@/app/lib/doctorAvailability';
import { parseDateTime } from '@/app/lib/parseDateTime';

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
  const rl = await checkRateLimit(`ai-chat:${ip}`, 30, 60 * 60 * 1000);
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
  const isFirstMessage = priorMessages.length === 0;

  conversation.messages.push({ role: 'user', content: message, createdAt: new Date() });

  const matchedEscalationRule = matchRule(aiConfig.escalationRules, message);

  // Predefined-answer short-circuit — zero AI calls (no embedding, no vector
  // search, no LLM generation) when the very first message of a session is
  // a close match for a curated FAQ. Scoped to the first message only: once
  // a conversation has turns of context, a canned FAQ answer would ignore
  // that context and feel deaf to it, which the full retrieval+generation
  // path handles correctly. Also skipped when an escalation rule matched —
  // a sensitive-topic message should always get the careful, guardrailed
  // full response, never a canned lookup. Reuses the same keyword-overlap
  // matcher already proven in the FAQ assistant (app/lib/rag/RAGService.ts).
  if (isFirstMessage && !matchedEscalationRule) {
    try {
      const activeFaqs = await (Faq as any)
        .find({ active: true })
        .select('question answer')
        .limit(300)
        .lean();
      const predefined = findBestPredefinedMatch(message, activeFaqs);
      if (predefined) {
        const assistantCreatedAt = new Date();
        conversation.messages.push({
          role: 'assistant', content: predefined.answer, cards: [], escalated: false, createdAt: assistantCreatedAt,
        });
        conversation.lastMessageAt = assistantCreatedAt;
        await conversation.save().catch((e: any) => console.error('[ai-chat] failed to persist conversation', e));

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(ndjson({ type: 'delta', text: predefined.answer }));
            controller.enqueue(ndjson({ type: 'cards', cards: [] }));
            controller.enqueue(ndjson({ type: 'meta', createdAt: assistantCreatedAt.toISOString() }));
            controller.enqueue(ndjson({ type: 'done' }));
            controller.close();
          },
        });
        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } });
      }
    } catch (e) {
      console.error('[ai-chat] predefined-match lookup failed', e);
      // Fall through to the full retrieval+generation path below — a failed
      // lookup should never block the patient from getting an answer.
    }
  }

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

  // Real-time availability grounding — not full tool-calling (the model
  // doesn't decide when to call this, it's a cheap keyword pre-check), but
  // it replaces "the LLM guesses/deflects" with real data whenever a
  // patient's message plausibly asks about it. Silently skipped if no
  // branch is known (no ?location=/?clinic= on the page) — nothing to
  // ground without one, and the AI already defers to "book a consultation"
  // in that case.
  //
  // Two tiers: if a SPECIFIC date+time is confidently parseable from the
  // message (parseDateTime — "tomorrow 11am"), use the real per-doctor
  // check (app/lib/doctorAvailability.ts, the same Appointment/
  // DoctorSlotBlock conflict logic the admin CRM's own availability
  // checker uses) so the AI can name real doctors, not just say a slot
  // time exists. Otherwise fall back to the branch-level 3-day summary
  // (app/lib/availability.ts) for vaguer questions ("are you open
  // tomorrow") that don't name an exact time to check a doctor against.
  let availabilityBlock = '';
  const AVAILABILITY_KEYWORDS = ['available', 'availability', 'slot', 'free time', 'when can', 'today', 'tomorrow', 'open now', 'opening hours', 'timing', 'timings', 'doctor'];
  const resolvedLocation = canonicalizeLocation(location);
  if (resolvedLocation && AVAILABILITY_KEYWORDS.some(k => message.toLowerCase().includes(k))) {
    const specificSlot = parseDateTime(message);
    try {
      if (specificSlot) {
        const result = await getDoctorAvailability(resolvedLocation, specificSlot.date, specificSlot.time);
        if (!result.open) {
          const why = result.reason === 'holiday' ? `closed (holiday: ${result.holidayLabel})` : result.reason === 'closed_day' ? 'closed' : 'hours not set up yet';
          availabilityBlock = `Requested slot: ${specificSlot.date} at ${specificSlot.time} — clinic is ${why} that day. Do not offer or imply a specific doctor/time is bookable.`;
        } else {
          const free = result.doctors.filter(d => d.available);
          availabilityBlock = free.length
            ? `Requested slot: ${specificSlot.date} at ${specificSlot.time} — REAL doctors confirmed free at exactly this time (use these real names, never invent a doctor or imply someone else is free): ${free.map(d => `${d.name} (${d.title})`).join(', ')}.`
            : `Requested slot: ${specificSlot.date} at ${specificSlot.time} — no doctor is free at exactly this time (checked against real appointment records). Do not claim any doctor is available then; offer to check a nearby time or take a booking request instead.`;
        }
      } else {
        const days = await getBranchAvailability(resolvedLocation, 3);
        // Explicit TODAY/TOMORROW labels, not just raw dates — a first pass
        // that only gave dates (e.g. "2026-08-13 (Thursday): ...") led the
        // model to hedge and ask the patient what today's date was, even
        // though the real date was right there. Spelling it out removes any
        // need for the model to infer "first item = today" on its own.
        const DAY_LABEL = ['TODAY', 'TOMORROW', 'DAY AFTER TOMORROW'];
        availabilityBlock = days.map((d, i) => {
          const label = `${DAY_LABEL[i] || `+${i} days`} (${d.date}, ${d.weekday})`;
          if (!d.open) {
            const why = d.reason === 'holiday' ? `closed (holiday: ${d.holidayLabel})` : d.reason === 'closed_day' ? 'closed' : 'hours not set up yet';
            return `${label}: ${why}`;
          }
          return d.slots.length
            ? `${label}: open, slot times: ${d.slots.join(', ')}`
            : `${label}: open, but no specific slot times configured — suggest they call or book and the clinic will confirm a time`;
        }).join('\n');
      }
    } catch (e) {
      console.error('[ai-chat] availability lookup failed', e);
      // Fall through with no availability block — the model still answers,
      // just without this grounding for this turn.
    }
  }

  const systemPrompt = [
    CLINICAL_AI_GUARDRAILS,
    aiConfig.systemPrompt,
    contextBlock ? `Context from the clinic's knowledge base (ground your answer in this; if the answer isn't here, say you're not certain and suggest booking a consultation):\n\n${contextBlock}` : '',
    availabilityBlock ? `Real clinic availability for ${resolvedLocation}, already resolved to today's actual date — use this directly, do not ask the patient what today's date is or which day they mean by "today"/"tomorrow", that's already given below. This is branch-level open hours and configured slot times, not a specific doctor's personal schedule — never claim a named doctor personally has a given slot free:\n\n${availabilityBlock}` : '',
    contextBlock && aiConfig.enableRecommendations && aiConfig.recommendationPrompt ? aiConfig.recommendationPrompt : '',
    quickActionsText ? `Available quick actions you may mention: ${quickActionsText}.` : '',
    aiConfig.enableWhatsappHandoff ? 'If the patient wants a human, offer to continue on WhatsApp.' : '',
    matchedEscalationRule ? `This message touches a sensitive topic the clinic wants handled carefully: ${matchedEscalationRule.message}` : '',
  ].filter(Boolean).join('\n\n');

  if (!isConfiguredProviderReady()) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(ndjson({ type: 'error', message: 'AI service is not configured.' }));
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  // Goes through the provider-agnostic facade (app/lib/ai/index.ts) instead
  // of talking to Anthropic's raw SSE shape directly — generateChatStream()
  // normalizes whichever provider AI_PROVIDER points at into plain text
  // deltas. `model` is Anthropic-specific (Settings.ai.model stores Claude
  // model IDs) and is simply ignored by any other provider — see
  // app/lib/ai/types.ts.
  const chatMessages = [...priorMessages, { role: 'user' as const, content: message }];
  const streamGenerator = generateChatStream(chatMessages, {
    system: systemPrompt,
    maxTokens: 500,
    temperature: aiConfig.temperature ?? 0.4,
    model: aiConfig.model || 'claude-haiku-4-5-20251001',
  });

  // Pull the first chunk before committing to the streaming Response, same
  // as the old upstream.ok check — a connection failure surfaces as a clean
  // error event instead of a Response that starts streaming and then dies.
  let firstChunk: IteratorResult<string>;
  try {
    firstChunk = await streamGenerator.next();
  } catch (err) {
    console.error('[ai-chat] provider error', err);
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
      let fullText = '';

      try {
        if (!firstChunk.done) {
          fullText += firstChunk.value;
          controller.enqueue(ndjson({ type: 'delta', text: firstChunk.value }));
        }
        for await (const text of streamGenerator) {
          fullText += text;
          controller.enqueue(ndjson({ type: 'delta', text }));
        }
      } catch (err) {
        // A failure partway through the stream — whatever text already
        // reached the visitor stays; fall through to persist/close exactly
        // like a clean finish rather than leaving the widget hanging with
        // no 'done' event.
        console.error('[ai-chat] mid-stream error', err);
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
