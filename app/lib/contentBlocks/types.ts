// Content Block Builder (Phase 1) — reuses the existing page-builder's
// BuilderSection shape ({id, type, visible, data}) at a finer grain: blocks
// inside a single long-form content field (Service.narrativeBlocks,
// Blog.bodyBlocks) rather than sections of a whole page. Anything that
// already has its own structured field + admin UI on Service (FAQ, journey/
// timeline, comparison, benefits) is deliberately NOT a block type here —
// duplicating those as blocks would fragment content into two competing
// systems for the same thing.
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
  | "divider";

export interface ContentBlockTypeDef {
  type: ContentBlockType;
  label: string;
  icon: string;
  defaultData: Record<string, any>;
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  return [{ id: `paragraph-${Date.now()}`, type: "paragraph", visible: true, data: { html: `<p>${escapeHtml(text).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />")}</p>` } }];
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
