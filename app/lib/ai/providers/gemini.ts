import { logAiUsage } from '../usageLog';
import { fetchWithRetry } from '../http';
import { buildCacheKey, getCached, setCached } from '../cache';
import type { AIProvider } from '../types';

// Matches the default in app/lib/ai/index.ts's generic facade — kept as a
// separate constant here (not imported) since this file must stay
// independent of index.ts to avoid a circular import (index.ts imports
// geminiProvider from this file).
const DEFAULT_CACHE_TTL_SECONDS = 3600;

// Shared Gemini call for the RAG/knowledge-base feature (embedding text for
// the Atlas Vector Search index, grounded answer generation for the FAQ
// assistant) and for the 5 admin SEO-suggestion routes (keyword-suggestions,
// meta-suggestions, blog/story/landing-page seo-keywords), which previously
// each hand-rolled their own fetch to the (now-404ing) "gemini-2.5-flash-lite"
// model — all consolidated onto this file's callGeminiText/embedGeminiText.
const GEMINI_TEXT_MODEL = "gemini-flash-lite-latest";
const GEMINI_EMBED_MODEL = "gemini-embedding-001"; // outputs 3072-dim vectors — the Atlas Vector Search index must be created with numDimensions: 3072
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function friendlyGeminiError(status: number, errText: string): string {
  if (status === 401 || status === 403) {
    return "AI service authentication failed — contact your administrator to check the Gemini API key.";
  }
  if (status === 429) {
    return "AI service is busy right now — please try again in a moment.";
  }
  if (/quota|resource_exhausted/i.test(errText)) {
    return "AI service quota is exhausted — contact your administrator.";
  }
  return "AI service is temporarily unavailable — please try again.";
}

async function geminiRequest(model: string, path: string, body: Record<string, unknown>): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI not configured");

  const start = Date.now();
  const response = await fetchWithRetry(`${GEMINI_BASE}/${model}:${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    const message = friendlyGeminiError(response.status, errText);
    logAiUsage("gemini", false, message, { model, latencyMs });
    throw new Error(message);
  }

  const data = await response.json();
  // generateContent responses carry usageMetadata; embedContent responses
  // don't (embeddings bill on input tokens only, and this API doesn't
  // report a token count for them) — the fields are simply absent there,
  // so inputTokens/outputTokens come through undefined for embed calls.
  const usage = data?.usageMetadata;
  logAiUsage("gemini", true, undefined, {
    model,
    inputTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
    latencyMs,
  });
  return data;
}

export interface CallGeminiTextOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  // Opt-in Redis cache, same contract as app/lib/ai/index.ts's
  // generateText() — but this stays a Gemini-pinned call (never rerouted
  // to another provider by AI_PROVIDER) since callers of callGeminiText
  // are asking for Gemini specifically, not "whichever provider is
  // configured." Omitting cacheKey means "always call fresh," the
  // existing default every current call site keeps unless it opts in.
  cacheKey?: string;
  cacheTtlSeconds?: number;
}

async function callGeminiTextUncached(prompt: string, opts?: CallGeminiTextOptions): Promise<string> {
  const data = await geminiRequest(GEMINI_TEXT_MODEL, "generateContent", {
    contents: [{ parts: [{ text: prompt }] }],
    ...(opts?.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      maxOutputTokens: opts?.maxTokens ?? 500,
      ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts?.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

export async function callGeminiText(prompt: string, opts?: CallGeminiTextOptions): Promise<string> {
  if (!opts?.cacheKey) return callGeminiTextUncached(prompt, opts);

  const redisKey = buildCacheKey(opts.cacheKey, {
    model: GEMINI_TEXT_MODEL,
    prompt,
    system: opts.system,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    jsonMode: opts.jsonMode,
  });
  const cached = await getCached(redisKey);
  if (cached !== null) return cached;

  const result = await callGeminiTextUncached(prompt, opts);
  await setCached(redisKey, result, opts.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS);
  return result;
}

export async function embedGeminiText(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[]> {
  const data = await geminiRequest(GEMINI_EMBED_MODEL, "embedContent", {
    content: { parts: [{ text }] },
    taskType,
  });

  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) throw new Error("Empty embedding response");
  return values;
}

// The AIProvider-shaped entry point for the swappable resolver (see
// app/lib/ai/index.ts). Not used by any call site in this codebase today —
// RAG/embeddings/SEO call embedGeminiText/callGeminiText directly and by
// name, same reasoning as anthropicProvider in providers/anthropic.ts.
// generateChat has no true multi-turn equivalent in callGeminiText's
// current shape (it's single-shot text generation, which is all this
// codebase has ever needed from Gemini), so it's approximated here by
// taking the most recent user message as the prompt — good enough to
// satisfy the interface, not exercised by anything yet.
export const geminiProvider: AIProvider = {
  name: 'gemini',
  generateText: (prompt, options) => callGeminiText(prompt, { maxTokens: options?.maxTokens }),
  generateChat: (messages, options) => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const prompt = typeof lastUser?.content === 'string' ? lastUser.content : '';
    return callGeminiText(prompt, { system: options?.system, maxTokens: options?.maxTokens });
  },
};
