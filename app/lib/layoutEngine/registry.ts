import { z } from 'zod';
import type { SectionRegistryEntry } from './types';

import EMICalculator from '@/app/components/EMICalculator';
import DoctorsSection from '@/app/components/homepage/DoctorsSection';
import DoctorSectionLp from '@/app/components/lp/sections/DoctorSection';
import DoctorCard from '@/app/components/doctors/DoctorCard';
import OfferBannerServer from '@/app/components/banners/templates/OfferBanner';
import OfferBannerSectionLp from '@/app/components/lp/sections/OfferBannerSection';
import VideoAcademySection from '@/app/components/homepage/VideoAcademySection';
import VideoSectionLp from '@/app/components/lp/sections/VideoSection';
import FaqAccordion from '@/app/components/FaqAccordion';
import FAQAccordionHomepage from '@/app/components/homepage/FAQAccordion';
import FaqSectionLp from '@/app/components/lp/sections/FaqSection';
import FormSection from '@/app/components/lp/sections/FormSection';
import ConsultationFormBar from '@/app/components/homepage/ConsultationFormBar';
import TestimonialsSlider from '@/app/components/homepage/TestimonialsSlider';
import ReviewsSectionLp from '@/app/components/lp/sections/ReviewsSection';
import BlogInsights from '@/app/components/homepage/BlogInsights';
import BeforeAfterGallery from '@/app/components/BeforeAfterGallery';
import BeforeAfterSectionHomepage from '@/app/components/homepage/BeforeAfterSection';
import BeforeAfterSectionLp from '@/app/components/lp/sections/BeforeAfterSection';
import NewsletterSignup from '@/app/components/NewsletterSignup';
import CtaSectionLp from '@/app/components/lp/sections/CtaSection';
import RelatedServicesPager from '@/app/components/RelatedServicesPager';

// A passthrough bag for the many components whose current prop shape is
// already `data: any` (untyped CMS bag) — the config schema validates the
// wrapper envelope only; it isn't the job of this registry to retroactively
// invent stricter types those components don't enforce themselves.
const dataBag = z.object({ data: z.record(z.string(), z.any()).default({}) });

export const SECTION_REGISTRY: SectionRegistryEntry[] = [
  // ── EMI Calculator ─────────────────────────────────────────────────────
  {
    sectionType: 'emi_calculator',
    variant: 'default',
    label: 'EMI Calculator',
    icon: '💳',
    component: EMICalculator,
    renderMode: 'client',
    configSchema: z.object({ price: z.number().optional() }),
    // On a Service Page the live Service.price is the source of truth, not a
    // duplicated, driftable copy in section content.
    contextBindings: { price: 'page.price' },
    allowedPageTypes: ['service', 'landing'],
    allowedZones: ['sidebar', 'main'],
  },

  // ── Doctors (two non-interchangeable implementations) ───────────────────
  {
    sectionType: 'doctors',
    variant: 'homepage',
    label: 'Doctors (Grid + Location Tabs)',
    icon: '🩺',
    component: DoctorsSection,
    renderMode: 'client',
    configSchema: dataBag,
    allowedPageTypes: ['home', 'service'],
    allowedZones: ['main'],
  },
  {
    sectionType: 'doctors',
    variant: 'lp',
    label: 'Doctors (Single Spotlight)',
    icon: '🩺',
    component: DoctorSectionLp,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        photo: z.string().optional(),
        name: z.string().optional(),
        qualification: z.string().optional(),
        experience: z.string().optional(),
        bio: z.string().optional(),
        location: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        achievements: z.array(z.string()).optional(),
        quote: z.string().optional(),
        ctaText: z.string().optional(),
      }),
    }),
    selfAnimates: true,
    contextBindings: { formAnchorId: 'page.formAnchorId' },
    allowedPageTypes: ['landing'],
    allowedZones: ['main'],
  },

  // ── Doctor Card (extracted, item #11 — was inline-only) ─────────────────
  {
    sectionType: 'doctor_card',
    variant: 'default',
    label: 'Doctor Card',
    icon: '🪪',
    component: DoctorCard,
    renderMode: 'server',
    configSchema: z.object({ doc: z.record(z.string(), z.any()) }),
    allowedPageTypes: ['service', 'blog', 'landing'],
    allowedZones: ['sidebar', 'main', 'related'],
  },

  // ── Offer Banner (two non-interchangeable implementations) ──────────────
  {
    sectionType: 'offer_banner',
    variant: 'default',
    label: 'Offer Banner (Static)',
    icon: '🏷️',
    component: OfferBannerServer,
    renderMode: 'server',
    configSchema: z.object({ banner: z.record(z.string(), z.any()) }),
    allowedPageTypes: ['home', 'service', 'blog', 'doctor', 'location', 'offer'],
    allowedZones: ['hero', 'main', 'sidebar'],
  },
  {
    sectionType: 'offer_banner',
    variant: 'lp',
    label: 'Offer Banner (Animated Countdown)',
    icon: '🏷️',
    component: OfferBannerSectionLp,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        badge: z.string().optional(),
        headline: z.string().optional(),
        subtext: z.string().optional(),
        expiry: z.string().optional(),
        emiAvailable: z.boolean().optional(),
        ctaText: z.string().optional(),
        animationStyle: z.enum(['urgent', 'festive', 'glow', 'minimal']).optional(),
        slotsLeft: z.number().optional(),
        totalSlots: z.number().optional(),
        emiText: z.string().optional(),
      }),
    }),
    contextBindings: { formAnchorId: 'page.formAnchorId' },
    allowedPageTypes: ['landing'],
    allowedZones: ['main'],
  },

  // ── Video (two non-interchangeable implementations) ─────────────────────
  {
    sectionType: 'video',
    variant: 'homepage',
    label: 'Video Academy Grid',
    icon: '🎬',
    component: VideoAcademySection,
    renderMode: 'client',
    configSchema: dataBag,
    allowedPageTypes: ['home', 'service', 'blog', 'doctor'],
    allowedZones: ['main', 'sidebar'],
  },
  {
    sectionType: 'video',
    variant: 'lp',
    label: 'Video (Single, Modal Player)',
    icon: '🎬',
    component: VideoSectionLp,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        headline: z.string().optional(),
        subtitle: z.string().optional(),
        badge: z.string().optional(),
        videoUrl: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        autoplayMuted: z.boolean().optional(),
        caption: z.string().optional(),
      }),
    }),
    allowedPageTypes: ['landing'],
    allowedZones: ['main'],
  },

  // ── FAQ (three non-interchangeable implementations, different field names) ─
  {
    sectionType: 'faq',
    variant: 'server',
    label: 'FAQ (Native Accordion, SSR)',
    icon: '❓',
    component: FaqAccordion,
    renderMode: 'server',
    configSchema: z.object({
      faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    }),
    allowedPageTypes: ['service', 'blog', 'doctor', 'location', 'offer'],
    allowedZones: ['main', 'sidebar'],
  },
  {
    sectionType: 'faq',
    variant: 'homepage',
    label: 'FAQ (Two-Column, Interactive)',
    icon: '❓',
    component: FAQAccordionHomepage,
    renderMode: 'client',
    configSchema: dataBag,
    allowedPageTypes: ['home'],
    allowedZones: ['main'],
  },
  {
    sectionType: 'faq',
    variant: 'lp',
    label: 'FAQ (LP, q/a fields)',
    icon: '❓',
    component: FaqSectionLp,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        headline: z.string().optional(),
        items: z.array(z.object({ q: z.string().optional(), a: z.string().optional() })).optional(),
      }),
    }),
    allowedPageTypes: ['landing'],
    allowedZones: ['main'],
  },

  // ── Appointment Card (item #6 — canonical = LP FormSection per decision) ──
  {
    sectionType: 'appointment_card',
    variant: 'lp',
    label: 'Appointment Card (Multi-Field Form)',
    icon: '📅',
    component: FormSection,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        headline: z.string().optional(),
        subtext: z.string().optional(),
        urgencyPoints: z.array(z.string()).optional(),
        slotsLeft: z.number().optional(),
        phone: z.string().optional(),
      }),
      fields: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['text', 'tel', 'email', 'select', 'textarea']),
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
      })).default([]),
      submitText: z.string().optional(),
      successMessage: z.string().optional(),
    }),
    contextBindings: { slug: 'page.slug', formAnchorId: 'page.formAnchorId' },
    allowedPageTypes: ['landing'],
    allowedZones: ['main', 'sidebar'],
  },
  {
    sectionType: 'appointment_card',
    variant: 'homepage',
    label: 'Appointment Card (Inline Bar)',
    icon: '📅',
    component: ConsultationFormBar,
    renderMode: 'client',
    configSchema: dataBag,
    allowedPageTypes: ['home', 'service'],
    allowedZones: ['main'],
  },

  // ── Testimonials (two non-interchangeable implementations) ──────────────
  {
    sectionType: 'testimonials',
    variant: 'homepage',
    label: 'Testimonials (Slider/Grid)',
    icon: '⭐',
    component: TestimonialsSlider,
    renderMode: 'client',
    configSchema: dataBag,
    // Self-fetches /api/reviews client-side unless data._reviews was
    // server-prefetched — a lazily-mounted/collapsible zone will trigger a
    // real network request on first reveal if not prefetched. Not a prop
    // issue, just a placement caveat worth surfacing in the builder UI.
    allowedPageTypes: ['home', 'service', 'blog', 'doctor'],
    allowedZones: ['main', 'sidebar'],
  },
  {
    sectionType: 'testimonials',
    variant: 'lp',
    label: 'Testimonials (Carousel)',
    icon: '⭐',
    component: ReviewsSectionLp,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        headline: z.string().optional(),
        subtitle: z.string().optional(),
        reviews: z.array(z.object({
          name: z.string().optional(),
          rating: z.number().optional(),
          text: z.string().optional(),
          treatment: z.string().optional(),
        })).optional(),
      }),
    }),
    allowedPageTypes: ['landing'],
    allowedZones: ['main'],
  },

  // ── Related Blogs ────────────────────────────────────────────────────────
  {
    sectionType: 'related_blogs',
    variant: 'default',
    label: 'Related Blogs',
    icon: '📰',
    component: BlogInsights,
    renderMode: 'server',
    configSchema: dataBag,
    allowedPageTypes: ['home', 'service', 'blog', 'doctor', 'location'],
    allowedZones: ['main', 'related', 'sidebar'],
  },

  // ── Results / Before-After (three duplicated slider implementations) ────
  {
    sectionType: 'results',
    variant: 'service',
    label: 'Results (Before/After Gallery)',
    icon: '📸',
    component: BeforeAfterGallery,
    renderMode: 'client',
    configSchema: z.object({
      pairs: z.array(z.object({
        before: z.object({ url: z.string() }),
        after: z.object({ url: z.string() }),
        concern: z.string().optional(),
      })),
      serviceName: z.string(),
    }),
    contextBindings: { serviceName: 'page.name' },
    allowedPageTypes: ['service'],
    allowedZones: ['main'],
  },
  {
    sectionType: 'results',
    variant: 'homepage',
    label: 'Results (Before/After, Home)',
    icon: '📸',
    component: BeforeAfterSectionHomepage,
    renderMode: 'client',
    configSchema: dataBag,
    allowedPageTypes: ['home'],
    allowedZones: ['main'],
  },
  {
    sectionType: 'results',
    variant: 'lp',
    label: 'Results (Before/After, LP)',
    icon: '📸',
    component: BeforeAfterSectionLp,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        headline: z.string().optional(),
        disclaimer: z.string().optional(),
        pairs: z.array(z.object({
          label: z.string().optional(),
          before: z.object({ url: z.string().optional() }).optional(),
          after: z.object({ url: z.string().optional() }).optional(),
        })).optional(),
      }),
    }),
    allowedPageTypes: ['landing'],
    allowedZones: ['main'],
  },

  // ── Newsletter ───────────────────────────────────────────────────────────
  {
    sectionType: 'newsletter',
    variant: 'default',
    label: 'Newsletter Signup',
    icon: '✉️',
    component: NewsletterSignup,
    renderMode: 'client',
    configSchema: z.object({ source: z.string().optional() }),
    allowedPageTypes: ['blog', 'service', 'home', 'doctor', 'location', 'offer'],
    allowedZones: ['sidebar', 'main', 'before-footer'],
  },

  // ── Treatment CTA ────────────────────────────────────────────────────────
  {
    sectionType: 'treatment_cta',
    variant: 'lp',
    label: 'Treatment CTA Band',
    icon: '📣',
    component: CtaSectionLp,
    renderMode: 'client',
    configSchema: z.object({
      data: z.object({
        headline: z.string().optional(),
        subtext: z.string().optional(),
        ctaPrimary: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        badges: z.array(z.string()).optional(),
      }),
    }),
    selfAnimates: true,
    contextBindings: { formAnchorId: 'page.formAnchorId' },
    allowedPageTypes: ['landing', 'service', 'blog', 'doctor', 'location', 'offer'],
    allowedZones: ['main', 'sidebar', 'before-footer'],
  },

  // ── Related Services ─────────────────────────────────────────────────────
  {
    sectionType: 'related_services',
    variant: 'default',
    label: 'Related Services',
    icon: '🔗',
    component: RelatedServicesPager,
    renderMode: 'client',
    configSchema: z.object({
      related: z.array(z.object({
        _id: z.string(),
        name: z.string(),
        category: z.string(),
        location: z.string(),
        urlSlug: z.string(),
        effectiveSlug: z.string().optional(),
        price: z.number(),
        duration: z.number(),
        heroImage: z.object({ url: z.string().optional() }).optional(),
      })),
      pageSize: z.number(),
      catLabel: z.string(),
      cityName: z.string(),
      location: z.string(),
      catSlug: z.string(),
      showPriceOnCards: z.boolean(),
    }),
    allowedPageTypes: ['service', 'blog', 'location'],
    allowedZones: ['related', 'main', 'sidebar'],
  },
];

export function findRegistryEntry(sectionType: string, variant: string): SectionRegistryEntry | undefined {
  return SECTION_REGISTRY.find((e) => e.sectionType === sectionType && e.variant === variant);
}

export function getRegistryEntriesForPageType(pageType: string): SectionRegistryEntry[] {
  return SECTION_REGISTRY.filter((e) => e.allowedPageTypes.includes(pageType as any));
}
