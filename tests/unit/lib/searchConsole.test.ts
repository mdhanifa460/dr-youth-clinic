import { describe, it, expect } from 'vitest';
import { extractSearchConsoleToken } from '@/app/lib/searchConsole';

describe('extractSearchConsoleToken', () => {
  it('passes a bare token through unchanged', () => {
    expect(extractSearchConsoleToken('-VqHOZffax0MkSjumn2eQBst1RgbQi9EJgorvu4vzhE')).toBe(
      '-VqHOZffax0MkSjumn2eQBst1RgbQi9EJgorvu4vzhE'
    );
  });

  it('extracts the token from a pasted full <meta> tag (the real production mistake this fixes)', () => {
    const pasted = '<meta name="google-site-verification" content="-VqHOZffax0MkSjumn2eQBst1RgbQi9EJgorvu4vzhE" />';
    expect(extractSearchConsoleToken(pasted)).toBe('-VqHOZffax0MkSjumn2eQBst1RgbQi9EJgorvu4vzhE');
  });

  it('extracts from a tag using single quotes', () => {
    const pasted = "<meta name='google-site-verification' content='abc123' />";
    expect(extractSearchConsoleToken(pasted)).toBe('abc123');
  });

  it('extracts from a bare content="..." fragment without the full tag', () => {
    expect(extractSearchConsoleToken('content="xyz789"')).toBe('xyz789');
  });

  it('strips stray quotes/brackets from a partial paste', () => {
    expect(extractSearchConsoleToken('"abc123"')).toBe('abc123');
    expect(extractSearchConsoleToken('<abc123>')).toBe('abc123');
  });

  it('returns empty string for empty/whitespace input', () => {
    expect(extractSearchConsoleToken('')).toBe('');
    expect(extractSearchConsoleToken('   ')).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(extractSearchConsoleToken('  abc123  ')).toBe('abc123');
  });
});
