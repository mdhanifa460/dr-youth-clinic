// Shared Gemini call for the RAG/knowledge-base feature only (embedding text
// for the Atlas Vector Search index, and grounded answer generation for the
// FAQ assistant). Mirrors app/lib/ai/anthropic.ts's structure (one internal
// request fn per endpoint shape, thin exported wrappers, a friendly-error
// classifier) but is a NEW, separate file — the 4 existing admin SEO routes
// (keyword-suggestions, meta-suggestions, blog/[id]/seo-keywords,
// landing-pages/[id]/seo-keywords) each keep their own local callGemini()
// untouched; consolidating those is out of scope for this feature.
// NOTE: the 4 existing SEO routes hardcode "gemini-2.5-flash-lite" — verified
// live against the current GEMINI_API_KEY that this model id now 404s
// ("no longer available to new users"), so those routes are currently broken
// independent of this feature. Out of scope to fix here (see file header),
// flagged to the user separately. This file uses models verified working
// live against the current key.
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

  const response = await fetch(`${GEMINI_BASE}/${model}:${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(friendlyGeminiError(response.status, errText));
  }

  return response.json();
}

export async function callGeminiText(prompt: string, opts?: { system?: string; maxTokens?: number }): Promise<string> {
  const data = await geminiRequest(GEMINI_TEXT_MODEL, "generateContent", {
    contents: [{ parts: [{ text: prompt }] }],
    ...(opts?.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: { maxOutputTokens: opts?.maxTokens ?? 500 },
  });

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty AI response");
  return text;
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
