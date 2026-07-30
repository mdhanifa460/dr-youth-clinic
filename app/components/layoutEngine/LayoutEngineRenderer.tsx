import type { SectionPageType } from '@/app/models/Section';
import { getLayoutTemplateForPageType } from '@/app/lib/layoutEngine/templates';
import { renderZoneSections } from './renderZoneSections';

// Root of the shared Content Layout Engine for a fully-migrated page type
// (every zone driven by Section docs). SEO (generateMetadata / JSON-LD)
// happens entirely outside this component, in each page's own page.tsx, and
// is untouched by this engine. For a page mid-migration (only one zone —
// e.g. Service Pages' sidebar — moved over so far), call
// `renderZoneSections` directly for just that zone instead of this component.
export default async function LayoutEngineRenderer({
  pageType,
  pageId,
  context,
}: {
  pageType: SectionPageType;
  pageId: string;
  context: Record<string, any>;
}) {
  const template = getLayoutTemplateForPageType(pageType);

  const zoneResults = await Promise.all(
    template.zones.map(async (zoneDef) => ({
      zoneDef,
      elements: await renderZoneSections({ pageType, pageId, context, zone: zoneDef.name }),
    }))
  );

  return (
    <div className={template.containerClass}>
      {zoneResults.map(({ zoneDef, elements }) =>
        elements.length === 0 ? null : (
          <div key={zoneDef.name} className={zoneDef.widthClass}>
            {elements}
          </div>
        )
      )}
    </div>
  );
}
