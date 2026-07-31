import type { ComponentType } from 'react';
import type { ZodTypeAny } from 'zod';
import type { SectionPageType, SectionZone } from '@/app/models/Section';

// A registry key is {sectionType, variant} rather than just {sectionType} —
// most of the 13 components this engine wraps already have 2-3 divergent,
// non-interchangeable implementations across Home/LP/Service (different prop
// shapes, some self-fetch, some self-animate). The registry keeps them as
// separate entries and lets the page/zone context pick the right one, rather
// than forcing a single normalized shape onto components that don't share one.
export interface SectionRegistryEntry {
  sectionType: string;
  variant: string;
  label: string;
  icon: string;
  component: ComponentType<any>;
  // Whether the leaf component itself is a Server or Client Component today.
  // The Layout Engine must not force a server-renderable leaf into a client
  // boundary unless the zone actually needs animation/collapsible behavior.
  renderMode: 'server' | 'client';
  configSchema: ZodTypeAny;
  // Page-derived props resolved at render time instead of shown as editable
  // fields in the builder — e.g. EMI Calculator's `price` on a Service Page
  // should track the live Service.price, not a duplicated, driftable copy.
  // Maps prop name -> dot-path into the render context (`page.*`).
  contextBindings?: Record<string, string>;
  // True if the component already does its own framer-motion whileInView
  // (or similar) animation internally — the zone wrapper must not also
  // animate it, or it double-animates.
  selfAnimates?: boolean;
  // True if only one instance of this sectionType may exist per page (across
  // both zones combined) — e.g. FAQ, Appointment Card, Doctor Card, Related
  // Services, Related Blogs. The builder hides/disables it in the Section
  // Library once one is already placed anywhere on the page. Sections like
  // Treatment CTA, Testimonials, Video, or Newsletter are repeatable and
  // leave this unset.
  singleton?: boolean;
  allowedPageTypes: SectionPageType[];
  allowedZones: SectionZone[];
}

export interface LayoutZoneDef {
  name: SectionZone;
  label: string;
  widthClass: string; // Tailwind class applied to the zone container
  stickyEligible: boolean;
  allowMultiple: boolean;
}

export interface LayoutTemplateDef {
  name: string;
  label: string;
  pageTypes: SectionPageType[];
  zones: LayoutZoneDef[];
  // Tailwind class for the grid/container that arranges the zones together
  // (e.g. the `lg:grid-cols-3` split between main + sidebar).
  containerClass: string;
}
