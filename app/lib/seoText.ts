import type { Metadata } from 'next';

// Search-result title and description shaping, shared by every public page.
// Titles: the root layout adds " | DR Youth Clinic" to every page title.
// That is dropped (title.absolute) when the title already names the clinic,
// which previously produced "… | DR Youth Clinic | DR Youth Clinic", or when
// the suffix would push it past what Google shows. The title's own words
// are never cut or rewritten; they are usually admin-written.

export const BRAND = 'DR Youth Clinic';
const SUFFIX = ` | ${BRAND}`;
// Google cuts titles at roughly 600px, about 60 characters.
const TITLE_MAX = 60;
const DESC_MAX = 160;
const DESC_MIN = 70;

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

export function pageTitle(raw: string | undefined | null): NonNullable<Metadata['title']> {
  let t = tidy(String(raw || ''));
  if (!t) return BRAND;
  // "X | DR Youth Clinic | DR Youth Clinic" → "X | DR Youth Clinic"
  t = t.replace(/(\s*[|–—-]\s*DR Youth Clinics?)(\s*[|–—-]\s*DR Youth Clinics?)+$/i, '$1');
  if (/DR Youth Clinic/i.test(t)) return { absolute: t };
  if ((t + SUFFIX).length > TITLE_MAX) return { absolute: t };
  return t;
}

// Shortens a description to what Google shows, at a sentence end if one is
// close enough, else at a word boundary with an ellipsis.
export function clampDescription(raw: string, max = DESC_MAX): string {
  const s = tidy(raw);
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd >= 100) return cut.slice(0, sentenceEnd + 1);
  const space = cut.slice(0, max - 1).lastIndexOf(' ');
  return cut.slice(0, space > 60 ? space : max - 1).replace(/[\s,;:–—-]+$/, '') + '…';
}

// First candidate that is long enough to be useful; if none is, the longest.
// Always clamped. Candidates are real page text, never invented.
export function metaDescription(...candidates: Array<string | undefined | null>): string {
  const list = candidates.map((c) => tidy(String(c || ''))).filter(Boolean);
  if (list.length === 0) return '';
  const good = list.find((c) => c.length >= DESC_MIN);
  return clampDescription(good || list.reduce((a, b) => (b.length > a.length ? b : a)));
}
