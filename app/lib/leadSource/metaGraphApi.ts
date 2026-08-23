// Thin, dependency-free Meta Graph API client for Lead Ads — no SDK added
// (per the explicit "no unnecessary dependencies" instruction), just plain
// fetch() with Meta's own documented shapes. Every function here is
// best-effort where the data isn't essential (form question labels,
// campaign name) and hard-fails with a typed, classified error where it
// is (the lead itself) — never throws uncaught, always returns a typed
// result the caller can branch on without a try/catch of its own.
//
// GRAPH_API_VERSION is a plain string constant, not fetched from Meta —
// verify this is still current when actually wiring up a real App (Meta
// deprecates old versions on a rolling schedule; this is not something
// the codebase can know on its own).
const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// A generous but finite timeout — a hung Graph API call must never hang
// the webhook response Meta is waiting on indefinitely (Meta itself times
// out and retries after ~20s, so this stays comfortably under that).
const REQUEST_TIMEOUT_MS = 10_000;

async function graphFetch(path: string, accessToken: string): Promise<{ ok: true; data: any } | { ok: false; error: string; retryable: boolean; expiredToken: boolean }> {
  const url = `${GRAPH_API_BASE}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.error) {
      // Meta's own error envelope: { error: { message, type, code, error_subcode } }.
      // code 190 = expired/invalid OAuth access token — the one error the
      // caller needs to distinguish from everything else, since it means
      // "an admin needs to reconnect this connector," not "retry later."
      const code = body?.error?.code;
      const expiredToken = code === 190;
      // 4/17/32/613 are Meta's own rate-limit codes — safe to retry after
      // a delay; most other 4xx (bad request shape, permissions) are not.
      const retryable = !expiredToken && [4, 17, 32, 613].includes(code);
      return {
        ok: false,
        // Never include the access token itself, and Meta's own message
        // text doesn't echo it back either — safe to surface as-is.
        error: body?.error?.message || `Graph API request failed (HTTP ${res.status})`,
        retryable,
        expiredToken,
      };
    }
    return { ok: true, data: body };
  } catch (err: any) {
    const aborted = err?.name === "AbortError";
    return { ok: false, error: aborted ? "Graph API request timed out" : (err?.message || "Graph API request failed"), retryable: true, expiredToken: false };
  } finally {
    clearTimeout(timeout);
  }
}

export interface MetaLeadFieldData {
  name: string;
  values: unknown[];
}

export interface MetaLeadData {
  id: string;
  created_time?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  field_data: MetaLeadFieldData[];
}

export type MetaApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; retryable: boolean; expiredToken: boolean };

// The one call that MUST succeed for a lead to be recorded at all — the
// leadgen webhook event itself carries no answers, only a reference (see
// the architecture investigation's Gap 9). Requests exactly the fields
// this integration uses; Meta returns field_data as an array of
// {name, values} — values is ALWAYS an array (length 1 for text/single-
// choice, length >1 for a real multiple-choice answer), never a bare
// scalar, which is what makes multi-select answers safely recoverable
// (see normalizeMetaAnswers in metaWebhookProcessing.ts).
export async function fetchMetaLead(leadgenId: string, accessToken: string): Promise<MetaApiResult<MetaLeadData>> {
  if (!leadgenId) return { ok: false, error: "Missing leadgen_id", retryable: false, expiredToken: false };
  const result = await graphFetch(
    `/${encodeURIComponent(leadgenId)}?fields=id,created_time,ad_id,adset_id,campaign_id,form_id,field_data`,
    accessToken
  );
  if (!result.ok) return result;
  const data = result.data;
  if (!data?.id || !Array.isArray(data?.field_data)) {
    return { ok: false, error: "Malformed lead response from Graph API — missing id or field_data", retryable: false, expiredToken: false };
  }
  return { ok: true, data };
}

// Best-effort ONLY — this enriches customAnswers with the original
// question TEXT (Meta's leadgen event/lead fetch above gives you the
// question's internal `name` key, e.g. "what_is_your_skin_concern_", not
// the human-readable label the patient actually saw). A failure here must
// never block recording the lead itself — the caller falls back to the
// raw field name as the question text, which still satisfies "never
// silently drop the answer," just with a less readable label. Not cached
// across calls in this file (a cache would be a real, deliberate addition
// — left to the caller/a future pass, since Vercel serverless functions
// don't share memory between invocations anyway).
export async function fetchMetaFormQuestions(formId: string, accessToken: string): Promise<Record<string, { label: string; type: string }>> {
  if (!formId) return {};
  const result = await graphFetch(`/${encodeURIComponent(formId)}?fields=questions`, accessToken);
  if (!result.ok || !Array.isArray(result.data?.questions)) return {};
  const out: Record<string, { label: string; type: string }> = {};
  for (const q of result.data.questions) {
    if (q?.key) out[String(q.key)] = { label: String(q?.label || q.key), type: String(q?.type || "") };
  }
  return out;
}

// Best-effort ONLY, same reasoning as fetchMetaFormQuestions — campaign
// NAME (not just the ID the webhook already carries) is a "nice to have"
// for the admin UI; a failure here (e.g. the token lacks ads_read
// permission) must never block recording the lead.
export async function fetchMetaCampaignName(campaignId: string, accessToken: string): Promise<string> {
  if (!campaignId) return "";
  const result = await graphFetch(`/${encodeURIComponent(campaignId)}?fields=name`, accessToken);
  if (!result.ok || typeof result.data?.name !== "string") return "";
  return result.data.name;
}
