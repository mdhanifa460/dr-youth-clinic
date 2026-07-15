// Content Health Score — a rules-based checklist over an already-loaded
// block array. Deliberately no AI call: this is meant to run instantly on
// every keystroke (via useMemo in the editor), not round-trip to Claude.
import type { ContentBlock } from "./types";
import { stripHtml } from "./types";

export interface ContentHealthCheck {
  label: string;
  passed: boolean;
  message: string;
  // True when this check doesn't apply to the current content (e.g. FAQ
  // presence on a Blog post) — excluded from the score, shown as neutral.
  na?: boolean;
}

export interface ContentHealthResult {
  score: number;
  checks: ContentHealthCheck[];
}

const REFERENCE_TYPES = new Set([
  "faq-block",
  "benefits-block",
  "treatment-steps-block",
  "recovery-timeline-block",
  "journey-block",
  "journey-explorer-block",
  "comparison-block",
]);

function isBlockEmpty(block: ContentBlock): boolean {
  const data = block.data || {};
  switch (block.type) {
    case "heading":
      return !data.text?.trim();
    case "paragraph":
      return !stripHtml(data.html || "").trim();
    case "bullet-list":
    case "numbered-list":
      return !Array.isArray(data.items) || data.items.filter((i: string) => i?.trim()).length === 0;
    case "image":
      return !data.url;
    case "quote":
      return !data.text?.trim();
    case "callout":
      return !data.text?.trim();
    case "cta":
      return !data.label?.trim() || !data.href?.trim();
    case "doctor-recommendation":
      return !data.doctorId || !data.quote?.trim();
    case "suitability":
      return !data.suitableFor?.trim() && !data.notSuitableFor?.trim();
    case "expected-results":
      return !Array.isArray(data.items) || data.items.filter((i: any) => i?.description?.trim()).length === 0;
    case "side-effects":
      return !Array.isArray(data.items) || data.items.filter((i: any) => i?.effect?.trim()).length === 0;
    case "related-link":
      return !data.entityType || !data.entityId;
    case "image-gallery":
      return !Array.isArray(data.images) || data.images.filter((i: any) => i?.url).length === 0;
    case "youtube-embed":
      return !data.youtubeUrl?.trim();
    case "video-block":
      return !data.videoId;
    case "pdf-download":
      return !data.url?.trim();
    case "divider":
      return false; // structural, never "empty"
    case "key-takeaways":
      return !Array.isArray(data.items) || data.items.filter((i: string) => i?.trim()).length === 0;
    case "checklist":
      return !Array.isArray(data.items) || data.items.filter((i: any) => i?.text?.trim()).length === 0;
    case "timeline":
      return !Array.isArray(data.steps) || data.steps.filter((s: any) => s?.label?.trim()).length === 0;
    case "procedure":
      return !Array.isArray(data.steps) || data.steps.filter((s: any) => s?.title?.trim()).length === 0;
    case "recovery":
      return !Array.isArray(data.stages) || data.stages.filter((s: any) => s?.phase?.trim()).length === 0;
    case "comparison-table":
      return !Array.isArray(data.headers) || data.headers.length === 0 || !Array.isArray(data.rows) || data.rows.filter((r: any) => r?.label?.trim()).length === 0;
    case "statistics":
      return !Array.isArray(data.stats) || data.stats.filter((s: any) => s?.value?.trim()).length === 0;
    case "research-citation":
      return !Array.isArray(data.citations) || data.citations.filter((c: any) => c?.text?.trim()).length === 0;
    case "before-after":
      return !Array.isArray(data.pairs) || data.pairs.filter((p: any) => p?.before?.url && p?.after?.url).length === 0;
    case "doctor-tip":
      return !data.text?.trim();
    case "faq":
      return !Array.isArray(data.items) || data.items.filter((i: any) => i?.question?.trim() && i?.answer?.trim()).length === 0;
    case "benefits":
      return !Array.isArray(data.items) || data.items.filter((i: any) => i?.title?.trim()).length === 0;
    default:
      return false; // reference blocks (see REFERENCE_TYPES) — positional, not admin-authored
  }
}

export function computeContentHealth(
  blocks: ContentBlock[] | undefined,
  opts?: { hasFaq?: boolean }
): ContentHealthResult {
  const visible = (blocks || []).filter((b) => b.visible);
  const checks: ContentHealthCheck[] = [];

  // 1. Heading hierarchy
  {
    const headings = visible.filter((b) => b.type === "heading" && b.data?.text?.trim());
    const hasH2orH3 = headings.some((h) => h.data.level === 2 || h.data.level === 3);
    const firstH2orH3Index = headings.findIndex((h) => h.data.level === 2 || h.data.level === 3);
    const earlyH4 = headings.some((h, i) => h.data.level === 4 && (firstH2orH3Index === -1 || i < firstH2orH3Index));
    const passed = headings.length > 0 && hasH2orH3 && !earlyH4;
    checks.push({
      label: "Heading hierarchy",
      passed,
      message: headings.length === 0
        ? "No headings yet — add at least one to structure this content."
        : !hasH2orH3
        ? "Only sub-headings found — add a top-level (H2) heading."
        : earlyH4
        ? "A sub-heading (H4) appears before any H2/H3 — check the order."
        : `${headings.length} heading${headings.length === 1 ? "" : "s"}, well-structured.`,
    });
  }

  // 2. Readability
  {
    const paragraphs = visible.filter((b) => b.type === "paragraph" && b.data?.html);
    const text = paragraphs.map((p) => stripHtml(p.data.html)).join(" ").trim();
    if (!text) {
      checks.push({ label: "Readability", passed: true, message: "No paragraph text yet." });
    } else {
      const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
      const words = text.split(/\s+/).filter(Boolean).length;
      const avgWordsPerSentence = sentences.length > 0 ? words / sentences.length : words;
      const passed = avgWordsPerSentence <= 35;
      checks.push({
        label: "Readability",
        passed,
        message: passed
          ? `Averaging ${Math.round(avgWordsPerSentence)} words/sentence — easy to read.`
          : `Averaging ${Math.round(avgWordsPerSentence)} words/sentence — consider shorter sentences.`,
      });
    }
  }

  // 3. CTA presence
  {
    const passed = visible.some((b) => b.type === "cta" || b.type === "related-link");
    checks.push({
      label: "Call to action",
      passed,
      message: passed ? "A CTA or related link is present." : "No CTA/related link block yet — add one to guide the reader.",
    });
  }

  // 4. FAQ presence — applicable when the caller says so, an FAQ reference
  // block is used (Service), or a freestanding "faq" block is used (Blog and
  // anywhere else — it carries its own data, unlike the Service-only ref type).
  {
    const hasFaqBlock = visible.some((b) => b.type === "faq-block");
    const freestandingFaqItems = visible
      .filter((b) => b.type === "faq")
      .flatMap((b) => (Array.isArray(b.data?.items) ? b.data.items : []))
      .filter((i: any) => i?.question?.trim() && i?.answer?.trim());
    const applicable = !!opts?.hasFaq || hasFaqBlock || visible.some((b) => b.type === "faq");
    if (!applicable) {
      checks.push({ label: "FAQ presence", passed: true, na: true, message: "Not applicable to this content." });
    } else {
      // Applicability can be triggered by the mere presence of an faq-block
      // reference, but whether it actually PASSES depends on the underlying
      // FAQ having real entries — a faq-block referencing an empty svc.faq
      // renders nothing on the public page, so it shouldn't score as "included".
      const passed = !!opts?.hasFaq || freestandingFaqItems.length > 0;
      checks.push({
        label: "FAQ presence",
        passed,
        message: passed ? "FAQ content is included." : "No FAQ found — consider adding one for SEO rich results.",
      });
    }
  }

  // 5. Image alt text
  {
    const images = visible.filter((b) => b.type === "image" && b.data?.url);
    const missingAlt = images.filter((b) => !b.data?.alt?.trim());
    const passed = missingAlt.length === 0;
    checks.push({
      label: "Image alt text",
      passed,
      message: images.length === 0
        ? "No images yet."
        : passed
        ? `All ${images.length} image${images.length === 1 ? "" : "s"} have alt text.`
        : `${missingAlt.length} of ${images.length} image${images.length === 1 ? "" : "s"} missing alt text.`,
    });
  }

  // 6. Internal links
  {
    const hasLinkBlock = visible.some((b) => ["cta", "related-link", "doctor-recommendation"].includes(b.type));
    const hasInlineLink = visible.some((b) => b.type === "paragraph" && /href=["']\//.test(b.data?.html || ""));
    const passed = hasLinkBlock || hasInlineLink;
    checks.push({
      label: "Internal links",
      passed,
      message: passed ? "At least one internal link found." : "No internal links yet — link to a related service, doctor, or page.",
    });
  }

  // 7. Empty blocks
  {
    const empty = visible.filter((b) => !REFERENCE_TYPES.has(b.type) && isBlockEmpty(b));
    const passed = empty.length === 0;
    checks.push({
      label: "No empty blocks",
      passed,
      message: passed ? "No empty blocks." : `${empty.length} block${empty.length === 1 ? " is" : "s are"} empty — fill in or remove ${empty.length === 1 ? "it" : "them"}.`,
    });
  }

  const applicableChecks = checks.filter((c) => !c.na);
  const score = applicableChecks.length === 0
    ? 100
    : Math.round((applicableChecks.filter((c) => c.passed).length / applicableChecks.length) * 100);

  return { score, checks };
}
