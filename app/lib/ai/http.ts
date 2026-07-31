// Shared retry/timeout wrapper for every provider's outbound fetch(). Same
// retryable-status policy the Anthropic SDK itself documents as its
// default (408/409/429/5xx + connection errors, up to 2 retries with
// backoff) — applied here to Anthropic, OpenAI, and Gemini alike so none of
// them silently surfaces a transient blip as a hard failure.
//
// Timeout semantics matter here: fetch() resolves once response headers
// arrive, not once the full body is read. The AbortController below is
// cleared the moment fetch() resolves, so it only ever bounds "time to
// first byte" (a genuinely hung connection) — it does NOT cut off a slow
// but actively-streaming or actively-generating response. A 1800-token
// completion that takes 40 seconds to fully generate is unaffected; a
// provider that never even starts responding within the timeout is what
// this catches.
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 529]);
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return 500 * 3 ** attempt; // 500ms, 1500ms
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { timeoutMs?: number; maxRetries?: number }
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok && RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
        // Drain/cancel the failed attempt's body before retrying so the
        // connection doesn't hang around unconsumed.
        await response.body?.cancel().catch(() => {});
        await sleep(backoffMs(attempt));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
