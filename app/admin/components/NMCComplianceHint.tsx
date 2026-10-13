"use client";

// NMC's "Guidelines on Ethical Advertising and Public Communication by
// Hospitals/Medical Institutions and Registered Medical Practitioners"
// (06.10.2026, effective immediately) bars unverifiable superiority/
// ranking claims ("best", "#1", "most trusted"), guaranteed-outcome
// language ("guaranteed cure", "100% success"), and similar wording
// unless the claim is actually verifiable. This is a live, real-time
// nudge shown wherever an admin edits public-facing marketing copy — not
// a hard block (some of these words ARE legitimately defensible when
// genuinely backed by a named, checkable source, e.g. a cited survey),
// just a checkpoint so a flagged word is a deliberate, informed choice
// rather than something nobody thought to check. This cannot know
// whether a given claim is actually verifiable — only a human who knows
// the real facts behind it can decide that.
const FLAGGED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bbest\b/i, label: '"best"' },
  { pattern: /\btop\b/i, label: '"top"' },
  { pattern: /#\s?1\b|\bnumber\s*one\b|\bno\.?\s*1\b/i, label: '"#1" / "number one"' },
  { pattern: /\branked\b/i, label: '"ranked"' },
  { pattern: /\bguarantee(d)?\b/i, label: '"guarantee(d)"' },
  { pattern: /\b100\s*%/i, label: '"100%"' },
  { pattern: /\bmost trusted\b/i, label: '"most trusted"' },
  { pattern: /\bcure[sd]?\b/i, label: '"cure"' },
  { pattern: /\bleading\b/i, label: '"leading"' },
];

export function nmcFlaggedWords(text?: string): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const { pattern, label } of FLAGGED_PATTERNS) {
    if (pattern.test(text) && !hits.includes(label)) hits.push(label);
  }
  return hits;
}

export default function NMCComplianceHint({ text }: { text?: string }) {
  const hits = nmcFlaggedWords(text);
  if (hits.length === 0) return null;
  return (
    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-snug">
      <span className="shrink-0">⚠️</span>
      <span>
        Contains {hits.join(', ')} — NMC's Oct 2026 Ethical Advertising Guidelines restrict unverifiable
        superiority/ranking/outcome claims. Only keep this if you can point to a real, named, checkable
        source (e.g. &quot;— Times Health Survey 2025&quot;, not unattributed).
      </span>
    </div>
  );
}
