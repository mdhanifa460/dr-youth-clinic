import type { LayoutTemplateDef } from './types';

// "Sidebar" behaves differently per page type today, so each template
// defines its own zone widths/stickiness/multiplicity rather than sharing
// one generic "sidebar" concept:
//   - Service Pages: a multi-widget sticky sidebar (booking card, clinic
//     info, eligibility checker, cost estimator, EMI calculator...).
//   - Blog: a single sticky widget (table of contents) today — the Blog
//     migration phase is what opens this zone up to multiple sections.
export const LAYOUT_TEMPLATES: Record<string, LayoutTemplateDef> = {
  'sidebar-layout': {
    name: 'sidebar-layout',
    label: 'Sidebar Layout',
    pageTypes: ['service'],
    containerClass: 'grid lg:grid-cols-3 gap-12',
    zones: [
      { name: 'hero', label: 'Hero', widthClass: 'w-full', stickyEligible: false, allowMultiple: false },
      { name: 'main', label: 'Main Content', widthClass: 'lg:col-span-2', stickyEligible: false, allowMultiple: true },
      { name: 'sidebar', label: 'Sidebar', widthClass: 'lg:col-span-1', stickyEligible: true, allowMultiple: true },
      { name: 'related', label: 'Related', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
      { name: 'before-footer', label: 'Before Footer', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
    ],
  },
  'blog-layout': {
    name: 'blog-layout',
    label: 'Blog Layout',
    pageTypes: ['blog'],
    containerClass: 'grid lg:grid-cols-[1fr_280px] gap-10',
    zones: [
      { name: 'hero', label: 'Hero', widthClass: 'w-full', stickyEligible: false, allowMultiple: false },
      { name: 'main', label: 'Article Body', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
      { name: 'sidebar', label: 'Sidebar', widthClass: 'hidden lg:block', stickyEligible: true, allowMultiple: true },
      { name: 'related', label: 'Related Posts', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
      { name: 'before-footer', label: 'CTA Band', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
    ],
  },
  'full-width-layout': {
    name: 'full-width-layout',
    label: 'Full Width Layout',
    pageTypes: ['home', 'landing', 'doctor', 'location', 'offer'],
    containerClass: 'flex flex-col',
    zones: [
      { name: 'hero', label: 'Hero', widthClass: 'w-full', stickyEligible: false, allowMultiple: false },
      { name: 'main', label: 'Main Content', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
      { name: 'related', label: 'Related', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
      { name: 'before-footer', label: 'Before Footer', widthClass: 'w-full', stickyEligible: false, allowMultiple: true },
    ],
  },
};

export function getLayoutTemplateForPageType(pageType: string): LayoutTemplateDef {
  const found = Object.values(LAYOUT_TEMPLATES).find((t) => t.pageTypes.includes(pageType as any));
  return found ?? LAYOUT_TEMPLATES['full-width-layout'];
}
