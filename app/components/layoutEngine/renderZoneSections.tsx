import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { CACHE_SAFETY_NET_SECONDS } from '@/app/lib/cacheConfig';
import { sectionsCacheTags } from '@/app/lib/layoutEngine/sectionsCache';
import { Section, type ISection, type SectionPageType, type SectionZone } from '@/app/models/Section';
import { findRegistryEntry } from '@/app/lib/layoutEngine/registry';
import { getLayoutTemplateForPageType } from '@/app/lib/layoutEngine/templates';
import { resolveContextBindings, evaluateCondition } from '@/app/lib/layoutEngine/resolveContext';
import ZoneWrapper from './ZoneWrapper';

// Resolves one zone's Section docs into rendered elements. This is the unit
// LayoutEngineRenderer composes across every zone for a fully-migrated page,
// and it's also what a still-hardcoded page (e.g. Service Pages mid-migration)
// can call directly to swap in just one zone — like the sidebar — while every
// other zone on the same page stays on the old hardcoded renderer.
export async function renderZoneSections({
  pageType,
  pageId,
  context,
  zone,
}: {
  pageType: SectionPageType;
  pageId: string;
  context: Record<string, any>;
  zone: SectionZone;
}) {
  const template = getLayoutTemplateForPageType(pageType);
  const zoneDef = template.zones.find((z) => z.name === zone);
  const stickyEligible = zoneDef?.stickyEligible ?? false;

  // Tagged so an admin section edit refreshes only pages of that pageType
  // (revalidateTag in app/api/admin/sections/*), instead of the old
  // revalidatePath('/', 'layout') that re-rendered every page on the site.
  const sections = await unstable_cache(
    async () => {
      await connectDB();
      const docs = await Section.find({ pageType, pageId, zone, enabled: true } as any)
        .sort({ displayOrder: 1 })
        .lean<ISection[]>();
      return JSON.parse(JSON.stringify(docs)) as ISection[];
    },
    ['layout-sections', pageType, pageId, zone],
    { revalidate: CACHE_SAFETY_NET_SECONDS, tags: sectionsCacheTags(pageType) }
  )();

  return sections
    .filter((s) => evaluateCondition(s.condition, context))
    .map((s) => {
      const entry = findRegistryEntry(s.sectionType, s.variant);
      if (!entry) return null;

      const Component = entry.component;
      const contextProps = resolveContextBindings(entry.contextBindings, context);
      const effectiveSection = { ...s, sticky: s.sticky && stickyEligible };

      return (
        <ZoneWrapper
          key={String(s._id)}
          section={effectiveSection}
          selfAnimates={entry.selfAnimates}
          label={entry.label}
        >
          <Component {...(s.content as Record<string, any>)} {...contextProps} />
        </ZoneWrapper>
      );
    })
    .filter((el): el is React.ReactElement => el !== null);
}
