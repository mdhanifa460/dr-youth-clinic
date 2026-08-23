import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchMetaLead, fetchMetaFormQuestions, fetchMetaCampaignName } from '@/app/lib/leadSource/metaGraphApi';

// Mocks the global fetch() Meta Graph API calls go through — no real
// network, no real Meta credentials, per the explicit "use mocks/fixtures"
// instruction. Response shapes match Meta's actual documented Graph API
// envelope (a top-level `error` object on failure, per
// developers.facebook.com/docs/graph-api/guides/error-handling).
function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchMetaLead — item 15: Meta API failure handling', () => {
  it('a successful response returns the full lead, including form/campaign identifiers', async () => {
    mockFetchOnce(200, {
      id: 'LEAD_1', created_time: '2026-01-01T00:00:00+0000',
      ad_id: 'AD_1', adset_id: 'ADSET_1', campaign_id: 'CAMPAIGN_1', form_id: 'FORM_1',
      field_data: [{ name: 'full_name', values: ['Priya'] }],
    });
    const result = await fetchMetaLead('LEAD_1', 'fake-token');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('LEAD_1');
      expect(result.data.form_id).toBe('FORM_1');
    }
  });

  it('item 14: an expired/invalid access token (Meta error code 190) is classified distinctly — "reconnect", not "retry"', async () => {
    mockFetchOnce(400, { error: { message: 'Error validating access token', type: 'OAuthException', code: 190 } });
    const result = await fetchMetaLead('LEAD_1', 'expired-token');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.expiredToken).toBe(true);
      expect(result.retryable).toBe(false);
    }
  });

  it('a rate-limit error (Meta error code 4) is classified as retryable', async () => {
    mockFetchOnce(400, { error: { message: 'Application request limit reached', code: 4 } });
    const result = await fetchMetaLead('LEAD_1', 'fake-token');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(true);
      expect(result.expiredToken).toBe(false);
    }
  });

  it('a generic 4xx error (e.g. malformed request) is neither retryable nor an expired-token case', async () => {
    mockFetchOnce(400, { error: { message: 'Unsupported request', code: 100 } });
    const result = await fetchMetaLead('LEAD_1', 'fake-token');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(false);
      expect(result.expiredToken).toBe(false);
    }
  });

  it('a malformed success response (missing field_data) is reported as an error, not silently accepted', async () => {
    mockFetchOnce(200, { id: 'LEAD_1' }); // no field_data at all
    const result = await fetchMetaLead('LEAD_1', 'fake-token');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/field_data/);
  });

  it('a missing leadgen_id is rejected before any network call is made', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await fetchMetaLead('', 'fake-token');
    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a network-level failure (e.g. DNS/timeout) is caught and reported, never thrown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));
    const result = await fetchMetaLead('LEAD_1', 'fake-token');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(true);
  });
});

describe('fetchMetaFormQuestions / fetchMetaCampaignName — best-effort, never block the lead', () => {
  it('form questions: a failed lookup degrades to an empty map, not an error', async () => {
    mockFetchOnce(400, { error: { message: 'Insufficient permission', code: 200 } });
    const labels = await fetchMetaFormQuestions('FORM_1', 'fake-token');
    expect(labels).toEqual({});
  });

  it('form questions: a successful lookup maps question key -> {label, type}', async () => {
    mockFetchOnce(200, { questions: [{ key: 'skin_concern', label: 'What is your skin concern?', type: 'SHORT_ANSWER' }] });
    const labels = await fetchMetaFormQuestions('FORM_1', 'fake-token');
    expect(labels.skin_concern).toEqual({ label: 'What is your skin concern?', type: 'SHORT_ANSWER' });
  });

  it('campaign name: a failed lookup degrades to an empty string, not an error', async () => {
    mockFetchOnce(400, { error: { message: 'Unsupported', code: 100 } });
    const name = await fetchMetaCampaignName('CAMPAIGN_1', 'fake-token');
    expect(name).toBe('');
  });
});
