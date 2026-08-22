import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature, verifyMetaChallenge } from '@/app/lib/whatsapp/inboundSecurity';

describe('verifyMetaSignature — Meta X-Hub-Signature-256, deliberately isolated from the generic lead-source HMAC', () => {
  const originalSecret = process.env.WHATSAPP_APP_SECRET;
  beforeEach(() => { process.env.WHATSAPP_APP_SECRET = 'a-real-meta-app-secret'; });
  afterEach(() => { process.env.WHATSAPP_APP_SECRET = originalSecret; });

  it('accepts a correctly-signed request', () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const sig = crypto.createHmac('sha256', 'a-real-meta-app-secret').update(body).digest('hex');
    expect(verifyMetaSignature(body, `sha256=${sig}`)).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const body = '{}';
    const sig = crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex');
    expect(verifyMetaSignature(body, `sha256=${sig}`)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const original = JSON.stringify({ a: 1 });
    const sig = crypto.createHmac('sha256', 'a-real-meta-app-secret').update(original).digest('hex');
    const tampered = JSON.stringify({ a: 2 });
    expect(verifyMetaSignature(tampered, `sha256=${sig}`)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyMetaSignature('{}', null)).toBe(false);
  });

  it('rejects when WHATSAPP_APP_SECRET is not configured', () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const sig = crypto.createHmac('sha256', 'anything').update('{}').digest('hex');
    expect(verifyMetaSignature('{}', `sha256=${sig}`)).toBe(false);
  });
});

describe('verifyMetaChallenge — Meta GET verification handshake', () => {
  const originalToken = process.env.WHATSAPP_VERIFY_TOKEN;
  beforeEach(() => { process.env.WHATSAPP_VERIFY_TOKEN = 'my-verify-token'; });
  afterEach(() => { process.env.WHATSAPP_VERIFY_TOKEN = originalToken; });

  it('accepts mode=subscribe with the matching token', () => {
    expect(verifyMetaChallenge('subscribe', 'my-verify-token')).toBe(true);
  });

  it('rejects a wrong token', () => {
    expect(verifyMetaChallenge('subscribe', 'wrong-token')).toBe(false);
  });

  it('rejects a mode other than subscribe', () => {
    expect(verifyMetaChallenge('unsubscribe', 'my-verify-token')).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(verifyMetaChallenge('subscribe', null)).toBe(false);
  });

  it('rejects when WHATSAPP_VERIFY_TOKEN is not configured server-side', () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    expect(verifyMetaChallenge('subscribe', 'anything')).toBe(false);
  });
});
