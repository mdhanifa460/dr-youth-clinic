import { describe, it, expect } from 'vitest';
import {
  extractLeadgenEvents,
  inferAnswerType,
  normalizeMetaAnswers,
  verifyMetaLeadSignature,
  verifyMetaLeadChallenge,
} from '@/app/lib/leadSource/metaWebhookProcessing';
import { buildDedupQuery, deriveLeadSourceAttribution } from '@/app/lib/leadSource/webhookProcessing';
import crypto from 'crypto';
import type { MappingFieldDef } from '@/app/lib/crm/fieldMapping';

// Standard field mapping every test below reuses — mirrors exactly what an
// admin would configure once, in the Lead Sources UI, for this one Meta
// connector (name/phone/email/gender ← Meta's own field keys).
const STANDARD_MAPPING: MappingFieldDef[] = [
  { platformField: 'name', externalField: 'full_name', required: true },
  { platformField: 'phone', externalField: 'phone_number', required: true },
  { platformField: 'email', externalField: 'email' },
  { platformField: 'gender', externalField: 'gender' },
];

describe('extractLeadgenEvents — Meta webhook envelope (entry[].changes[])', () => {
  it('extracts a single leadgen event with all identifiers, item 16/17: campaign metadata + form ID preservation', () => {
    const payload = {
      object: 'page',
      entry: [
        {
          id: 'PAGE_123',
          time: 1700000000,
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'LEAD_1',
                page_id: 'PAGE_123',
                form_id: 'FORM_SKIN',
                ad_id: 'AD_1',
                adgroup_id: 'ADSET_1',
                created_time: 1700000000,
              },
            },
          ],
        },
      ],
    };
    const events = extractLeadgenEvents(payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      leadgenId: 'LEAD_1', pageId: 'PAGE_123', formId: 'FORM_SKIN', adId: 'AD_1', adSetId: 'ADSET_1', createdTime: '1700000000',
    });
  });

  it('extracts MULTIPLE leadgen events from one POST — a real Meta batch delivery, different forms', () => {
    const payload = {
      entry: [
        { id: 'PAGE_1', changes: [{ field: 'leadgen', value: { leadgen_id: 'L1', form_id: 'FORM_SKIN' } }] },
        { id: 'PAGE_1', changes: [{ field: 'leadgen', value: { leadgen_id: 'L2', form_id: 'FORM_HAIR' } }] },
      ],
    };
    const events = extractLeadgenEvents(payload);
    expect(events.map((e) => e.formId)).toEqual(['FORM_SKIN', 'FORM_HAIR']);
  });

  it('ignores non-leadgen changes (e.g. a WhatsApp "messages" change under the same envelope shape)', () => {
    const payload = { entry: [{ id: 'X', changes: [{ field: 'messages', value: {} }] }] };
    expect(extractLeadgenEvents(payload)).toEqual([]);
  });

  it('skips a malformed change with no leadgen_id rather than crashing', () => {
    const payload = { entry: [{ id: 'X', changes: [{ field: 'leadgen', value: {} }] }] };
    expect(extractLeadgenEvents(payload)).toEqual([]);
  });

  it('returns an empty array for a completely malformed/empty payload — never throws', () => {
    expect(extractLeadgenEvents(null)).toEqual([]);
    expect(extractLeadgenEvents({})).toEqual([]);
    expect(extractLeadgenEvents('not even an object')).toEqual([]);
  });
});

describe('inferAnswerType — items 3-8: text, single_choice, multiple_choice, boolean, number, date', () => {
  it('text — a free-text answer with no type hint', () => {
    expect(inferAnswerType(['Acne'])).toBe('text');
  });

  it('single_choice — inferred from a form-question type hint (values alone cannot distinguish this from text)', () => {
    expect(inferAnswerType(['Chemical Peel'], 'DROPDOWN')).toBe('single_choice');
  });

  it('multiple_choice — Meta ALWAYS supplies multiple values as a real array; never collapses to a single string', () => {
    expect(inferAnswerType(['Chemical Peel', 'Laser', 'Facial'])).toBe('multiple_choice');
  });

  it('boolean — a yes/no value', () => {
    expect(inferAnswerType(['Yes'])).toBe('boolean');
    expect(inferAnswerType(['No'])).toBe('boolean');
  });

  it('number', () => {
    expect(inferAnswerType(['3'])).toBe('number');
    expect(inferAnswerType(['3.5'])).toBe('number');
  });

  it('date — ISO 8601 date-shaped value', () => {
    expect(inferAnswerType(['2026-01-15'])).toBe('date');
  });

  it('unknown for an empty/missing value — never mis-labeled as text', () => {
    expect(inferAnswerType([])).toBe('unknown');
    expect(inferAnswerType([''])).toBe('unknown');
  });
});

describe('normalizeMetaAnswers — the core dynamic-answer split (Parts 6, 7, 8, 9)', () => {
  it('item 1: standard fields map into `mapped`, matching exactly what the shared Booking pipeline reads', () => {
    const fieldData = [
      { name: 'full_name', values: ['Priya Sharma'] },
      { name: 'phone_number', values: ['9876543210'] },
      { name: 'email', values: ['priya@example.com'] },
      { name: 'gender', values: ['Female'] },
    ];
    const { mapped, customAnswers } = normalizeMetaAnswers(fieldData, STANDARD_MAPPING, {});
    expect(mapped.name).toBe('Priya Sharma');
    expect(mapped.phone).toBe('9876543210');
    expect(mapped.email).toBe('priya@example.com');
    expect(mapped.gender).toBe('Female');
    expect(customAnswers).toEqual([]); // nothing left over — every field was a standard field
  });

  it('item 2: a Skin form\'s custom questions become customAnswers, preserving question TEXT (item 8) via form-question labels', () => {
    const fieldData = [
      { name: 'full_name', values: ['Priya Sharma'] },
      { name: 'phone_number', values: ['9876543210'] },
      { name: 'what_is_your_skin_concern_', values: ['Acne'] },
      { name: 'duration', values: ['6 months'] },
    ];
    const labels = {
      what_is_your_skin_concern_: { label: 'What is your skin concern?', type: 'SHORT_ANSWER' },
      duration: { label: 'How long have you had this concern?', type: 'SHORT_ANSWER' },
    };
    const { customAnswers } = normalizeMetaAnswers(fieldData, STANDARD_MAPPING, labels);
    expect(customAnswers).toEqual([
      { questionId: 'what_is_your_skin_concern_', question: 'What is your skin concern?', answer: 'Acne', answerType: 'text' },
      { questionId: 'duration', question: 'How long have you had this concern?', answer: '6 months', answerType: 'text' },
    ]);
  });

  it('a DIFFERENT (Hair) form on the SAME connector produces completely different customAnswers — no shared columns, no code change', () => {
    const fieldData = [
      { name: 'full_name', values: ['Ravi Kumar'] },
      { name: 'phone_number', values: ['9876543211'] },
      { name: 'hair_concern', values: ['Hair Fall'] },
      { name: 'previous_treatment', values: ['Yes'] },
    ];
    const { customAnswers } = normalizeMetaAnswers(fieldData, STANDARD_MAPPING, {});
    expect(customAnswers.map((a) => a.questionId)).toEqual(['hair_concern', 'previous_treatment']);
    expect(customAnswers[1].answerType).toBe('boolean'); // "Yes" inferred as boolean
  });

  it('item 5/9: a multiple_choice answer stays a real array on `answer`, never "[object Object]" or a lost value', () => {
    const fieldData = [
      { name: 'full_name', values: ['Priya'] },
      { name: 'phone_number', values: ['9876543210'] },
      { name: 'treatments_interested', values: ['Chemical Peel', 'Laser', 'Facial'] },
    ];
    const { customAnswers } = normalizeMetaAnswers(fieldData, STANDARD_MAPPING, {});
    const answer = customAnswers.find((a) => a.questionId === 'treatments_interested');
    expect(answer?.answer).toEqual(['Chemical Peel', 'Laser', 'Facial']);
    expect(answer?.answerType).toBe('multiple_choice');
    expect(String(answer?.answer)).not.toBe('[object Object]');
  });

  it('item 9: a missing/optional question is simply absent from customAnswers — never a null placeholder entry', () => {
    const fieldData = [
      { name: 'full_name', values: ['Priya'] },
      { name: 'phone_number', values: ['9876543210'] },
    ];
    const { customAnswers } = normalizeMetaAnswers(fieldData, STANDARD_MAPPING, {});
    expect(customAnswers).toEqual([]);
  });

  it('item 10: a missing REQUIRED standard field (phone) is reported via missingRequired, same contract applyFieldMapping already has', () => {
    const fieldData = [{ name: 'full_name', values: ['Priya'] }];
    const { missingRequired } = normalizeMetaAnswers(fieldData, STANDARD_MAPPING, {});
    expect(missingRequired).toContain('phone_number');
  });

  it('falls back to the raw field key as the question text when form-question label lookup found nothing (best-effort, never blocks the lead)', () => {
    const fieldData = [
      { name: 'full_name', values: ['Priya'] },
      { name: 'phone_number', values: ['9876543210'] },
      { name: 'some_unlabeled_question', values: ['An answer'] },
    ];
    const { customAnswers } = normalizeMetaAnswers(fieldData, STANDARD_MAPPING, {});
    expect(customAnswers[0].question).toBe('some_unlabeled_question');
  });
});

describe('verifyMetaLeadSignature — item 13: webhook signature validation', () => {
  const appSecret = 'test-app-secret';
  const body = JSON.stringify({ entry: [] });

  it('accepts a correctly-signed request', () => {
    const sig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');
    expect(verifyMetaLeadSignature(body, sig, appSecret)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    expect(verifyMetaLeadSignature(body, 'sha256=deadbeef', appSecret)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyMetaLeadSignature(body, null, appSecret)).toBe(false);
  });

  it('rejects when no app secret is configured — never falls back to "unsigned = valid"', () => {
    const sig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');
    expect(verifyMetaLeadSignature(body, sig, '')).toBe(false);
  });
});

describe('verifyMetaLeadChallenge — item 12: GET verification handshake', () => {
  it('accepts a correct subscribe + matching verify_token', () => {
    expect(verifyMetaLeadChallenge('subscribe', 'my-token', 'my-token')).toBe(true);
  });

  it('rejects a mismatched verify_token', () => {
    expect(verifyMetaLeadChallenge('subscribe', 'wrong-token', 'my-token')).toBe(false);
  });

  it('rejects a non-"subscribe" mode', () => {
    expect(verifyMetaLeadChallenge('unsubscribe', 'my-token', 'my-token')).toBe(false);
  });

  it('rejects when no verify token is configured for this connector yet', () => {
    expect(verifyMetaLeadChallenge('subscribe', 'my-token', '')).toBe(false);
  });
});

describe('Meta Lead Ads reuses the EXISTING dedup/attribution mechanisms — items 11, 16', () => {
  it('item 11: leadgen_id maps directly onto the existing buildDedupQuery contract — a duplicate delivery resolves to the SAME query', () => {
    const first = buildDedupQuery('meta_lead_form', 'PAGE_123', 'LEAD_1');
    const retry = buildDedupQuery('meta_lead_form', 'PAGE_123', 'LEAD_1');
    expect(first).toEqual(retry);
    expect(first).toEqual({ externalCrmId: 'LEAD_1', conversionChannel: 'meta_lead_form', sourceAccount: 'PAGE_123' });
  });

  it('a duplicate leadgen_id from a DIFFERENT Page is correctly treated as a different lead — same isolation JustDial already gets', () => {
    const pageA = buildDedupQuery('meta_lead_form', 'PAGE_A', 'LEAD_1');
    const pageB = buildDedupQuery('meta_lead_form', 'PAGE_B', 'LEAD_1');
    expect(pageA).not.toEqual(pageB);
  });

  it('Meta Lead Ads attribution follows the exact Google Lead Form pattern: acquisition source simplifies to "meta", channel stays "meta_lead_form"', () => {
    expect(deriveLeadSourceAttribution('meta_lead_form')).toEqual({
      attributionSource: 'meta', conversionChannel: 'meta_lead_form', isGoogleLeadForm: false,
    });
  });
});
