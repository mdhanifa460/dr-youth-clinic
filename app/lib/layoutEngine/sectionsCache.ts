// Cache tags for layout-engine Section reads (renderZoneSections) — one per
// pageType, so editing e.g. a blog sidebar section doesn't also re-render
// the homepage and every service page.
export const SECTIONS_TAG = 'layout-sections';

export function sectionsTagFor(pageType: string): string {
  return `${SECTIONS_TAG}:${pageType}`;
}

export function sectionsCacheTags(pageType: string): string[] {
  return [SECTIONS_TAG, sectionsTagFor(pageType)];
}
