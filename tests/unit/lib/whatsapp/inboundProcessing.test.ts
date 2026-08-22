import { describe, it, expect } from 'vitest';
import { extractInboundMessages } from '@/app/lib/whatsapp/inboundProcessing';

// Real WhatsApp Cloud API webhook payload shape (documented at
// developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples),
// not guessed — these fixtures mirror it exactly.
function textMessagePayload(overrides: Partial<{ phoneNumberId: string; from: string; id: string; body: string; name: string }> = {}) {
  const { phoneNumberId = '109876543210', from = '919876543210', id = 'wamid.ABC123', body = 'Hi there', name = 'Test User' } = overrides;
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WABA_ID',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15550001111', phone_number_id: phoneNumberId },
          contacts: [{ profile: { name }, wa_id: from }],
          messages: [{ from, id, timestamp: '1700000000', type: 'text', text: { body } }],
        },
      }],
    }],
  };
}

describe('extractInboundMessages — pure parsing of Meta\'s real webhook payload shape', () => {
  it('extracts a single text message', () => {
    const result = extractInboundMessages(textMessagePayload());
    expect(result).toEqual([{
      phoneNumberId: '109876543210',
      from: '919876543210',
      messageId: 'wamid.ABC123',
      text: 'Hi there',
      contactName: 'Test User',
    }]);
  });

  it('ignores a status-update change (Meta sends delivery/read receipts on the same webhook)', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{ id: 'WABA_ID', changes: [{ field: 'message_status', value: { statuses: [{ id: 'wamid.X', status: 'delivered' }] } }] }],
    };
    expect(extractInboundMessages(payload)).toEqual([]);
  });

  it('ignores a non-text message (image/audio/location/...) — no body to carry an attribution token', () => {
    const payload = textMessagePayload();
    (payload.entry[0].changes[0].value.messages[0] as any).type = 'image';
    expect(extractInboundMessages(payload)).toEqual([]);
  });

  it('handles multiple messages across multiple entries/changes', () => {
    const a = textMessagePayload({ id: 'wamid.A', from: '911111111111' });
    const b = textMessagePayload({ id: 'wamid.B', from: '922222222222' });
    const combined = { object: 'whatsapp_business_account', entry: [...a.entry, ...b.entry] };
    const result = extractInboundMessages(combined);
    expect(result.map((m) => m.messageId)).toEqual(['wamid.A', 'wamid.B']);
  });

  it('is defensive against a missing/malformed payload — never throws, returns []', () => {
    expect(extractInboundMessages(null)).toEqual([]);
    expect(extractInboundMessages({})).toEqual([]);
    expect(extractInboundMessages({ entry: 'not an array' })).toEqual([]);
    expect(extractInboundMessages(undefined)).toEqual([]);
  });

  it('falls back to no contactName when Meta does not include a matching contact entry', () => {
    const payload = textMessagePayload();
    (payload.entry[0].changes[0].value as any).contacts = [];
    const result = extractInboundMessages(payload);
    expect(result[0].contactName).toBeUndefined();
  });
});
