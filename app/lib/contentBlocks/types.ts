// Content Block Builder (Phase 1) — reuses the existing page-builder's
// BuilderSection shape ({id, type, visible, data}) at a finer grain: blocks
// inside a single long-form content field (Service.narrativeBlocks,
// Blog.bodyBlocks) rather than sections of a whole page.
//
// Phase 2 adds "reference" block types (`availableIn: ['content-block-service']`)
// for content that already has a dedicated Service field + admin UI (FAQ,
// journey/timeline variants, comparison, benefits, recovery). These blocks
// store no data of their own — they render live from the parent Service
// document at request time (via the `serviceContext` prop on ContentBlockEditor/
// BlockRenderer), so admins can reposition them within the content flow
// without a second, competing copy of that data ever existing. Because the
// data only exists on Service, these types are Service-only — they never
// appear in Blog's "+ Add Block" picker.
import type { BuilderSection } from "@/app/lib/pageBuilder/types";

export type ContentBlock = BuilderSection;

export type ContentBlockType =
  | "heading"
  | "paragraph"
  | "bullet-list"
  | "numbered-list"
  | "image"
  | "quote"
  | "callout"
  | "cta"
  | "divider"
  // Phase 2 — reference blocks (Service-only, render live Service data)
  | "faq-block"
  | "benefits-block"
  | "treatment-steps-block"
  | "recovery-timeline-block"
  | "journey-block"
  | "journey-explorer-block"
  | "comparison-block"
  // Phase 2 — freestanding medical blocks (own stored data, work anywhere)
  | "doctor-recommendation"
  | "suitability"
  | "expected-results"
  | "side-effects"
  // Phase 2 Priority 2 — relationship engine
  | "related-link";

export type ContentBlockSourceSystem = "content-block-service" | "content-block-blog";

// Entity types the "related-link" block can point at (see
// app/lib/contentBlocks/relatedContent.ts for URL resolution). Location and
// standalone FAQ are deliberately not included — neither has a real entity
// model with its own detail page today (locations are a hardcoded city enum,
// FAQs only exist embedded inside Service/Video); adding either as a real
// linkable entity is a separate modeling decision, not a Relationship Engine
// wiring task.
export type RelatedEntityType = "service" | "doctor" | "blog" | "video" | "offer" | "landing-page";

// Shape passed to ContentBlockEditor (admin, from ServiceForm's in-memory
// form state) and BlockRenderer (public, from the fetched Service document)
// so the 7 reference block types above have something to render — the block
// itself carries none of this data. `current`/`relatedServices`/`doctors` are
// only ever populated on the public side (they need a DB fetch the admin
// form doesn't do); the admin editor only needs the plain Service fields to
// show a live "here's what this block will show" summary.
export interface BlockServiceContext {
  faq?: Array<{ question: string; answer: string }>;
  benefits?: Array<{ icon: string; title: string; description?: string }>;
  treatmentSteps?: Array<{ title: string; description?: string }>;
  recoveryTime?: string;
  recoveryStages?: Array<{ phase: string; icon: string; label: string; description?: string }>;
  journeyPhases?: Array<{ title: string; description: string }>;
  sessionsCount?: number;
  serviceName?: string;
  journeyExplorer?: Array<{ stage: string; progressPercent: number; summary: string; doctorTip?: string; dos?: string[]; donts?: string[] }>;
  journeyExplorerVisible?: boolean;
  painLevel?: string;
  current?: { _id: string; name: string; price: number; duration: number; sessionsRequired?: string; recoveryTime?: string; painLevel?: string; idealFor?: string[] };
  relatedServices?: Array<{ _id: string; name: string; price: number; duration: number; sessionsRequired?: string; recoveryTime?: string; painLevel?: string; idealFor?: string[] }>;
  doctors?: Record<string, { name: string; title: string; photo?: { url: string } }>;
}

export interface ContentBlockTypeDef {
  type: ContentBlockType;
  label: string;
  icon: string;
  defaultData: Record<string, any>;
  // Restricts which "+ Add Block" pickers offer this type. Omitted = available
  // everywhere (all 9 Phase 1 types, plus the 4 new freestanding types below).
  availableIn?: ContentBlockSourceSystem[];
}

export const CONTENT_BLOCK_TYPES: ContentBlockTypeDef[] = [
  { type: "heading", label: "Heading", icon: "🔠", defaultData: { level: 2, text: "" } },
  { type: "paragraph", label: "Paragraph", icon: "📝", defaultData: { html: "" } },
  { type: "bullet-list", label: "Bullet List", icon: "•", defaultData: { items: [""] } },
  { type: "numbered-list", label: "Numbered List", icon: "1.", defaultData: { items: [""] } },
  { type: "image", label: "Image", icon: "🖼️", defaultData: { url: "", publicId: "", alt: "", caption: "" } },
  { type: "quote", label: "Quote", icon: "❝", defaultData: { text: "", attribution: "" } },
  { type: "callout", label: "Callout", icon: "⚠️", defaultData: { variant: "info", text: "" } },
  { type: "cta", label: "Button / CTA", icon: "🔘", defaultData: { label: "Book Free Consultation", href: "/book" } },
  { type: "divider", label: "Divider", icon: "―", defaultData: {} },

  // Reference blocks — Service-only, no data of their own (see file header).
  { type: "faq-block", label: "FAQ (this service)", icon: "❓", defaultData: {}, availableIn: ["content-block-service"] },
  { type: "benefits-block", label: "Benefits (this service)", icon: "✨", defaultData: {}, availableIn: ["content-block-service"] },
  { type: "treatment-steps-block", label: "Treatment/Procedure Steps", icon: "🩺", defaultData: {}, availableIn: ["content-block-service"] },
  { type: "recovery-timeline-block", label: "Recovery Timeline", icon: "🌱", defaultData: {}, availableIn: ["content-block-service"] },
  { type: "journey-block", label: "Multi-Session Journey", icon: "🗓️", defaultData: {}, availableIn: ["content-block-service"] },
  { type: "journey-explorer-block", label: "Interactive Journey Explorer", icon: "🧭", defaultData: {}, availableIn: ["content-block-service"] },
  { type: "comparison-block", label: "Comparison Table", icon: "⚖️", defaultData: {}, availableIn: ["content-block-service"] },

  // Freestanding medical blocks — own stored data, available everywhere.
  { type: "doctor-recommendation", label: "Doctor Recommendation", icon: "👨‍⚕️", defaultData: { doctorId: "", quote: "" } },
  { type: "suitability", label: "Suitable For / Not Suitable For", icon: "✅", defaultData: { suitableFor: "", notSuitableFor: "" } },
  { type: "expected-results", label: "Expected Results", icon: "📈", defaultData: { items: [{ timeframe: "", description: "" }] } },
  { type: "side-effects", label: "Side Effects", icon: "⚠️", defaultData: { items: [{ effect: "", note: "" }] } },

  // Relationship engine — links to another CMS entity, resolved at render
  // time (see app/lib/contentBlocks/relatedContent.ts). Available everywhere.
  { type: "related-link", label: "Related Link", icon: "🔗", defaultData: { entityType: "", entityId: "", label: "" } },
];

export function newBlock(type: ContentBlockType): ContentBlock {
  const def = CONTENT_BLOCK_TYPES.find((t) => t.type === type);
  return {
    id: `${type}-${Date.now()}`,
    type,
    visible: true,
    data: JSON.parse(JSON.stringify(def?.defaultData ?? {})),
  };
}

function toAnchorId(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Wraps plain text back into the same simple HTML shape the Paragraph
// block's data.html expects — shared by plainTextToBlocks() below and the
// "Improve Writing" AI action (app/api/admin/content-blocks/improve).
export function plainTextToHtml(text: string): string {
  return `<p>${escapeHtml(text).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;
}

// Plain-text summary for SEO meta description / schema.org fallbacks and
// blog excerpts — pulled from whatever blocks actually carry readable text,
// skipping structural-only blocks (image, divider, cta).
export function blocksToPlainText(blocks: ContentBlock[] | undefined, maxLength = 300): string {
  if (!blocks || blocks.length === 0) return "";
  const parts: string[] = [];
  for (const b of blocks) {
    if (!b.visible) continue;
    switch (b.type) {
      case "heading":
        if (b.data?.text) parts.push(b.data.text);
        break;
      case "paragraph":
        if (b.data?.html) parts.push(stripHtml(b.data.html));
        break;
      case "quote":
        if (b.data?.text) parts.push(b.data.text);
        break;
      case "callout":
        if (b.data?.text) parts.push(b.data.text);
        break;
      case "bullet-list":
      case "numbered-list":
        if (Array.isArray(b.data?.items)) parts.push(b.data.items.filter(Boolean).join(". "));
        break;
      default:
        break;
    }
  }
  const combined = parts.join(" ").replace(/\s+/g, " ").trim();
  return combined.length > maxLength ? `${combined.slice(0, maxLength).trim()}…` : combined;
}

export interface BlockHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

// Mirrors app/lib/blogMarkdown.ts's extractHeadings() output shape, so the
// blog table-of-contents sidebar works identically for block-based posts.
export function extractHeadingsFromBlocks(blocks: ContentBlock[] | undefined): BlockHeading[] {
  if (!blocks) return [];
  return blocks
    .filter((b) => b.visible && b.type === "heading" && (b.data?.level === 2 || b.data?.level === 3) && b.data?.text)
    .map((b) => ({ id: toAnchorId(b.data.text), text: b.data.text, level: b.data.level as 2 | 3 }));
}

// One-click "convert my existing plain text to blocks" for Service.narrative
// — a single Paragraph block, so nobody has to retype existing content.
export function plainTextToBlocks(text: string): ContentBlock[] {
  if (!text?.trim()) return [];
  return [{ id: `paragraph-${Date.now()}`, type: "paragraph", visible: true, data: { html: plainTextToHtml(text) } }];
}

// One-click "convert my existing Markdown body to blocks" for Blog.body —
// a naive split (## / ### headings, - / 1. lists, > quotes, else paragraphs),
// intentionally not perfect — the admin tidies up in the block editor after.
export function markdownToBlocks(md: string): ContentBlock[] {
  if (!md?.trim()) return [];
  const chunks = md.split(/\n{2,}/);
  const blocks: ContentBlock[] = [];
  let counter = 0;
  const nextId = (type: string) => `${type}-${Date.now()}-${counter++}`;

  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    if (chunk.startsWith("### ")) {
      blocks.push({ id: nextId("heading"), type: "heading", visible: true, data: { level: 3, text: chunk.slice(4).trim() } });
      continue;
    }
    if (chunk.startsWith("## ")) {
      blocks.push({ id: nextId("heading"), type: "heading", visible: true, data: { level: 2, text: chunk.slice(3).trim() } });
      continue;
    }
    if (chunk.startsWith("> ")) {
      blocks.push({ id: nextId("quote"), type: "quote", visible: true, data: { text: chunk.slice(2).trim(), attribution: "" } });
      continue;
    }

    const lines = chunk.split("\n");
    if (lines.every((l) => l.trim().startsWith("- "))) {
      blocks.push({ id: nextId("bullet-list"), type: "bullet-list", visible: true, data: { items: lines.map((l) => l.trim().slice(2)) } });
      continue;
    }
    if (lines.every((l) => /^\d+\.\s/.test(l.trim()))) {
      blocks.push({ id: nextId("numbered-list"), type: "numbered-list", visible: true, data: { items: lines.map((l) => l.trim().replace(/^\d+\.\s/, "")) } });
      continue;
    }

    const inline = escapeHtml(chunk.replace(/\n/g, " "))
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    blocks.push({ id: nextId("paragraph"), type: "paragraph", visible: true, data: { html: `<p>${inline}</p>` } });
  }

  return blocks;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
