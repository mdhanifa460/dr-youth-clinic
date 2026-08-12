// Google Search Console's own "HTML tag" verification method shows admins
// a full tag to copy: <meta name="google-site-verification" content="TOKEN" />
// The admin field is documented as "token only," but that's just help text —
// nothing enforced it, and a real admin pasted the whole tag anyway. The
// result: the token ends up wrapped and HTML-escaped inside ANOTHER meta
// tag's content attribute, which Search Console can never recognize.
//
// Rather than rely on an admin reading the tooltip correctly, this makes
// "token only" true regardless of what actually gets pasted — called both
// at save time (so the admin UI reflects the clean value back) and at
// render time (so a stray legacy value already sitting in the database,
// like the one this was written to fix, self-heals without needing
// another admin round-trip).
export function extractSearchConsoleToken(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  // Pasted the full tag (or just a content="..." fragment) — pull out only
  // the value. Handles single or double quotes, any attribute order.
  const match = trimmed.match(/content\s*=\s*["']([^"']+)["']/i);
  if (match) return match[1].trim();

  // Already a bare token — still strip any stray angle brackets/quotes from
  // a partial paste (e.g. just `"TOKEN"` or `<TOKEN>`).
  return trimmed.replace(/^["'<>]+|["'<>]+$/g, '').trim();
}
