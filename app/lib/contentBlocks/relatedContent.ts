// Resolves "related-link" content blocks (see ./types.ts) to a real public
// URL + display info. Centralised here so both the Service and Blog public
// pages share one lookup instead of duplicating a per-entity-type switch —
// batches by entity type to avoid N+1 queries when a content field has
// several related-link blocks.
import { connectDB } from "@/app/lib/mongodb";
import { Service } from "@/app/models/Service";
import { Doctor } from "@/app/models/Doctor";
import { Blog } from "@/app/models/Blog";
import { Video } from "@/app/models/Video";
import { Offer } from "@/app/models/Offer";
import { LandingPage } from "@/app/models/LandingPage";
import { getServiceCities, getEffectiveSlug } from "@/app/lib/serviceSeo";
import type { ContentBlock, RelatedEntityType } from "./types";

export interface RelatedLinkInfo {
  href: string;
  title: string;
  subtitle?: string;
}

function relatedLinkKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

// Offer has no individual detail page/slug today — links to the offers list
// rather than a dead-end. Flagged here rather than silently broken.
const OFFER_SUBTITLE = "View this and other current offers";

export async function resolveRelatedLinks(blocks: ContentBlock[] | undefined): Promise<Record<string, RelatedLinkInfo>> {
  const refs = (blocks || []).filter((b) => b.type === "related-link" && b.data?.entityType && b.data?.entityId);
  if (refs.length === 0) return {};

  const idsByType: Partial<Record<RelatedEntityType, string[]>> = {};
  for (const b of refs) {
    const type = b.data.entityType as RelatedEntityType;
    (idsByType[type] ||= []).push(b.data.entityId);
  }

  await connectDB();
  const result: Record<string, RelatedLinkInfo> = {};

  await Promise.all([
    (async () => {
      if (!idsByType.service?.length) return;
      const docs = (await Service.find({ _id: { $in: idsByType.service } } as any).lean()) as any[];
      for (const s of docs) {
        const city = getServiceCities(s)[0] || "chennai";
        const slug = getEffectiveSlug(s, city);
        result[relatedLinkKey("service", String(s._id))] = {
          href: `/${city}/services/${(s.category || "").toLowerCase()}/${slug}`,
          title: s.name,
          subtitle: s.category,
        };
      }
    })(),
    (async () => {
      if (!idsByType.doctor?.length) return;
      const docs = (await Doctor.find({ _id: { $in: idsByType.doctor } } as any).lean()) as any[];
      for (const d of docs) {
        result[relatedLinkKey("doctor", String(d._id))] = { href: `/doctors/${d._id}`, title: d.name, subtitle: d.title };
      }
    })(),
    (async () => {
      if (!idsByType.blog?.length) return;
      const docs = (await Blog.find({ _id: { $in: idsByType.blog } } as any).lean()) as any[];
      for (const p of docs) {
        result[relatedLinkKey("blog", String(p._id))] = { href: `/blog/${p.slug}`, title: p.title };
      }
    })(),
    (async () => {
      if (!idsByType.video?.length) return;
      const docs = (await Video.find({ _id: { $in: idsByType.video } } as any).lean()) as any[];
      for (const v of docs) {
        result[relatedLinkKey("video", String(v._id))] = { href: `/academy/${v.slug}`, title: v.title };
      }
    })(),
    (async () => {
      if (!idsByType.offer?.length) return;
      const docs = (await Offer.find({ _id: { $in: idsByType.offer } } as any).lean()) as any[];
      for (const o of docs) {
        result[relatedLinkKey("offer", String(o._id))] = { href: `/offers`, title: o.title, subtitle: OFFER_SUBTITLE };
      }
    })(),
    (async () => {
      if (!idsByType["landing-page"]?.length) return;
      const docs = (await LandingPage.find({ _id: { $in: idsByType["landing-page"] } } as any).lean()) as any[];
      for (const lp of docs) {
        result[relatedLinkKey("landing-page", String(lp._id))] = { href: `/lp/${lp.slug}`, title: lp.title };
      }
    })(),
  ]);

  return result;
}
