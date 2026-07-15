// Article Intelligence — a whole-article CMS-completeness checklist,
// deliberately separate from health.ts (which scores block-content quality:
// heading hierarchy, readability, empty blocks). This scores whether the
// *article as a whole* has the pieces that make it trustworthy and
// discoverable: doctor review, sources, FAQ schema, local SEO, etc. Same
// instant, rules-based (no AI round-trip) philosophy as health.ts.
import type { ContentBlock } from "./types";
import { locations } from "@/app/data/locations";

export interface ArticleIntelligenceCheck {
  label: string;
  passed: boolean;
  message: string;
}

export interface ArticleIntelligenceResult {
  score: number;
  checks: ArticleIntelligenceCheck[];
}

export interface ArticlePostLike {
  bodyBlocks?: ContentBlock[];
  reviewedByDoctorId?: string | null;
  medicalReferences?: Array<{ label: string; url: string }>;
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
}

const CITY_NAMES = Object.values(locations).map((l) => l.name.toLowerCase());

export function computeArticleIntelligence(post: ArticlePostLike): ArticleIntelligenceResult {
  const blocks = (post.bodyBlocks || []).filter((b) => b.visible);

  const hasKeyTakeaways = blocks.some(
    (b) => b.type === "key-takeaways" && Array.isArray(b.data?.items) && b.data.items.some((i: string) => i?.trim())
  );

  const faqItems = blocks
    .filter((b) => b.type === "faq")
    .flatMap((b) => (Array.isArray(b.data?.items) ? b.data.items : []))
    .filter((i: any) => i?.question?.trim() && i?.answer?.trim());
  const hasFaq = faqItems.length > 0;

  const hasDoctorReview = !!post.reviewedByDoctorId;
  const hasReferences = (post.medicalReferences?.length ?? 0) > 0;

  const hasComparison = blocks.some(
    (b) => b.type === "comparison-table" && Array.isArray(b.data?.rows) && b.data.rows.some((r: any) => r?.label?.trim())
  );

  const hasBeforeAfter = blocks.some(
    (b) => b.type === "before-after" && Array.isArray(b.data?.pairs) && b.data.pairs.some((p: any) => p?.before?.url && p?.after?.url)
  );

  const hasVideo = blocks.some(
    (b) => (b.type === "video-block" && b.data?.videoId) || (b.type === "youtube-embed" && b.data?.youtubeUrl?.trim())
  );

  const hasRelatedService = blocks.some((b) => b.type === "related-link" && b.data?.entityType === "service" && b.data?.entityId);

  const hasAnyRelatedLink = blocks.some((b) => b.type === "related-link" && b.data?.entityType && b.data?.entityId);
  const hasInlineLink = blocks.some((b) => b.type === "paragraph" && /href=["']\//.test(b.data?.html || ""));
  const hasInternalLinks = hasAnyRelatedLink || hasInlineLink;

  const hasCta = blocks.some((b) => b.type === "cta" && b.data?.label?.trim() && b.data?.href?.trim());

  const seoText = `${post.metaTitle || ""} ${post.metaDescription || ""}`.toLowerCase();
  const hasLocalSeo = seoText.trim().length > 0 && (
    CITY_NAMES.some((c) => seoText.includes(c)) || (post.category ? seoText.includes(post.category.toLowerCase()) : false)
  );

  // FAQ schema is a direct consequence of #2 (FAQSchema only renders when
  // real FAQ items exist) — kept as its own row since it communicates a
  // different guarantee to the editor ("this will show up in Google").
  const hasFaqSchema = hasFaq;

  const checks: ArticleIntelligenceCheck[] = [
    { label: "AI Summary", passed: hasKeyTakeaways, message: hasKeyTakeaways ? "Key Takeaways block present." : "Add a Key Takeaways block so readers get a quick summary." },
    { label: "FAQ Present", passed: hasFaq, message: hasFaq ? `${faqItems.length} FAQ item${faqItems.length === 1 ? "" : "s"}.` : "Add an FAQ block — helps both readers and search rich results." },
    { label: "Doctor Review Assigned", passed: hasDoctorReview, message: hasDoctorReview ? "A reviewing doctor is assigned." : "Assign a reviewing doctor in Trust & Review." },
    { label: "Medical References Added", passed: hasReferences, message: hasReferences ? `${post.medicalReferences!.length} reference${post.medicalReferences!.length === 1 ? "" : "s"} cited.` : "Add sources in Trust & Review." },
    { label: "Treatment Comparison Included", passed: hasComparison, message: hasComparison ? "Comparison table present." : "Consider a Comparison Table block if this article compares options." },
    { label: "Before & After Linked", passed: hasBeforeAfter, message: hasBeforeAfter ? "Before/After block present." : "Consider a Before & After block if relevant." },
    { label: "Video Linked", passed: hasVideo, message: hasVideo ? "A video is embedded." : "Consider linking a video for engagement." },
    { label: "Related Services Linked", passed: hasRelatedService, message: hasRelatedService ? "Linked to a related service." : "Add a Related Link block pointing to a relevant service." },
    { label: "Internal Links Added", passed: hasInternalLinks, message: hasInternalLinks ? "At least one internal link found." : "Add a Related Link or in-text link to another page." },
    { label: "CTA Present", passed: hasCta, message: hasCta ? "A CTA block is present." : "Add a CTA block to guide the reader." },
    { label: "Local SEO Optimized", passed: hasLocalSeo, message: hasLocalSeo ? "Meta title/description reference a city or category." : "Mention a city or treatment category in the meta title/description." },
    { label: "FAQ Schema Generated", passed: hasFaqSchema, message: hasFaqSchema ? "FAQPage schema will be emitted." : "Add FAQ content to generate FAQPage schema for search results." },
  ];

  const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 100);

  return { score, checks };
}
