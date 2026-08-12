import { describe, it, expect } from 'vitest';
import { parseClaudeJson } from '@/app/lib/ai/providers/anthropic';

describe('parseClaudeJson', () => {
  it('parses well-formed JSON', () => {
    expect(parseClaudeJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it('strips ```json markdown fences some responses get wrapped in', () => {
    expect(parseClaudeJson<{ a: number }>('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseClaudeJson<{ a: number }>('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it('throws a clean, actionable message for truncated/malformed JSON instead of the raw SyntaxError', () => {
    // Reproduces the real production incident: Claude's response cut off
    // mid-array (e.g. maxTokens hit before the closing bracket), which
    // used to leak "Expected ',' or ']' after array element in JSON at
    // position N" straight through to the admin/patient UI via every one
    // of this function's 12 callers' `err.message`.
    const truncated = '{"items": [{"question": "How much", "answer": "It depends';
    expect(() => parseClaudeJson(truncated)).toThrow('The AI response was incomplete or malformed — please try again.');
    // Specifically NOT the raw native error text.
    expect(() => parseClaudeJson(truncated)).not.toThrow(/Expected|position/);
  });

  it('throws the same clean message for non-JSON text', () => {
    expect(() => parseClaudeJson('Sorry, I cannot help with that.')).toThrow('The AI response was incomplete or malformed — please try again.');
  });

  it('extracts the JSON block even with trailing prose after it — the real production case', () => {
    // Reproduces the exact shape seen from a real Claude call: a fenced
    // JSON block followed by an unrequested "Critical Summary" section.
    const raw = '```json\n{"a": 1, "b": [2, 3]}\n```\n\n### Critical Summary\n- Some extra commentary the prompt didn\'t ask for.';
    expect(parseClaudeJson<{ a: number; b: number[] }>(raw)).toEqual({ a: 1, b: [2, 3] });
  });

  it('repairs a raw literal newline inside a string value — the real production case', () => {
    // Reproduces the exact real failure: Claude emitted a literal newline
    // byte inside a "detail" field instead of an escaped \n, which
    // JSON.parse rejects outright as "Bad control character in string
    // literal". Repairing rather than just failing cleanly means most
    // real occurrences of this recover on the first try, not just the retry.
    const broken = '{"detail": "First sentence.\nSecond sentence."}';
    expect(parseClaudeJson<{ detail: string }>(broken)).toEqual({ detail: 'First sentence.\nSecond sentence.' });
  });

  it('does not corrupt valid multi-line JSON formatting (whitespace outside strings untouched)', () => {
    const pretty = '{\n  "a": 1,\n  "b": 2\n}';
    expect(parseClaudeJson<{ a: number; b: number }>(pretty)).toEqual({ a: 1, b: 2 });
  });
});
