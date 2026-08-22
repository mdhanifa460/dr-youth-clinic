import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

// A real 32-byte key for AES-256-GCM — CONNECTOR_ENCRYPTION_KEY must be set
// before app/lib/crm/encryption.ts (imported transitively via
// verifyWebhookSignature) is first evaluated, so it's generated and set
// here before the import below runs, not inside a beforeAll.
process.env.CONNECTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

import { verifyWebhookSignature } from '@/app/lib/webhookSignature';
import { encryptCredential } from '@/app/lib/crm/encryption';

function mockRequest(signatureHeader: string | null): any {
  return {
    headers: {
      get: (name: string) => {
        if (name === 'x-webhook-signature' || name === 'x-signature') return signatureHeader;
        return null;
      },
    },
  };
}

describe('verifyWebhookSignature — the one gate every inbound lead-source webhook goes through', () => {
  const secret = 'a-real-provider-signing-secret';
  const secretPayload = (() => {
    const { encrypted, iv, authTag } = encryptCredential(secret);
    return { encrypted, iv, authTag };
  })();

  it('accepts a correctly-signed request', () => {
    const body = JSON.stringify({ customer_mobile: '9999999999' });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const req = mockRequest(`sha256=${sig}`);
    expect(verifyWebhookSignature(req, body, secretPayload)).toBe(true);
  });

  it('rejects a request signed with the wrong secret', () => {
    const body = JSON.stringify({ customer_mobile: '9999999999' });
    const sig = crypto.createHmac('sha256', 'a-completely-different-secret').update(body).digest('hex');
    const req = mockRequest(`sha256=${sig}`);
    expect(verifyWebhookSignature(req, body, secretPayload)).toBe(false);
  });

  it('rejects a request whose body was tampered with after signing', () => {
    const originalBody = JSON.stringify({ customer_mobile: '9999999999' });
    const sig = crypto.createHmac('sha256', secret).update(originalBody).digest('hex');
    const tamperedBody = JSON.stringify({ customer_mobile: '8888888888' });
    const req = mockRequest(`sha256=${sig}`);
    expect(verifyWebhookSignature(req, tamperedBody, secretPayload)).toBe(false);
  });

  it('rejects a request with no signature header at all', () => {
    const req = mockRequest(null);
    expect(verifyWebhookSignature(req, '{}', secretPayload)).toBe(false);
  });

  it('rejects when the connector has no signing secret configured yet', () => {
    const req = mockRequest('sha256=anything');
    expect(verifyWebhookSignature(req, '{}', undefined)).toBe(false);
    expect(verifyWebhookSignature(req, '{}', { encrypted: '', iv: '', authTag: '' })).toBe(false);
  });

  it('accepts the header with or without the "sha256=" prefix some providers include', () => {
    const body = '{}';
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(mockRequest(sig), body, secretPayload)).toBe(true);
    expect(verifyWebhookSignature(mockRequest(`sha256=${sig}`), body, secretPayload)).toBe(true);
  });
});
