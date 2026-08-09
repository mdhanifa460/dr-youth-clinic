'use client';

import BannerCarousel from '@/app/components/banners/BannerCarousel';
import HeroSection from './sections/HeroSection';
import TrustBarSection from './sections/TrustBarSection';
import ProblemSection from './sections/ProblemSection';
import SolutionSection from './sections/SolutionSection';
import BenefitsSection from './sections/BenefitsSection';
import BeforeAfterSection from './sections/BeforeAfterSection';
import ProcessSection from './sections/ProcessSection';
import DoctorSection from './sections/DoctorSection';
import ReviewsSection from './sections/ReviewsSection';
import OfferBannerSection from './sections/OfferBannerSection';
import FaqSection from './sections/FaqSection';
import CtaSection from './sections/CtaSection';
import FormSection from './sections/FormSection';
import ComparisonSection from './sections/ComparisonSection';
import GuaranteeSection from './sections/GuaranteeSection';
import HairTimelineSection from './sections/HairTimelineSection';
import ClientJourneySection from './sections/ClientJourneySection';
import LocationSection from './sections/LocationSection';
import VideoSection from './sections/VideoSection';

interface LpSection {
  id: string;
  type: string;
  visible: boolean;
  data: Record<string, any>;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface LpRendererProps {
  sections: LpSection[];
  form: {
    fields: FormField[];
    submitText?: string;
    successMessage?: string;
    whatsappNotify?: boolean;
  };
  slug: string;
  variant?: 'A' | 'B';
  // Drives the default wording of every "Free ..." string across LP
  // sections (badges, CTA buttons, the form's eyebrow tag) from the same
  // Settings -> Free Labels switch the rest of the site already respects —
  // only ever fills in an UNSET default; any text an admin already typed
  // for a specific LP is left exactly as-is.
  consultationFree: boolean;
}

function renderSection(section: LpSection, form: LpRendererProps['form'], slug: string, variant: 'A' | 'B', consultationFree: boolean) {
  if (!section.visible) return null;

  switch (section.type) {
    case 'hero':
      return <HeroSection key={section.id} data={section.data} slug={slug} consultationFree={consultationFree} />;
    case 'trust-bar':
      return <TrustBarSection key={section.id} data={section.data} />;
    case 'problem':
      return <ProblemSection key={section.id} data={section.data} />;
    case 'solution':
      return <SolutionSection key={section.id} data={section.data} />;
    case 'benefits':
      return <BenefitsSection key={section.id} data={section.data} />;
    case 'before-after':
      return <BeforeAfterSection key={section.id} data={section.data} />;
    case 'process':
      return <ProcessSection key={section.id} data={section.data} />;
    case 'doctor':
      return <DoctorSection key={section.id} data={section.data} />;
    case 'reviews':
      return <ReviewsSection key={section.id} data={section.data} />;
    case 'hair-timeline':
      return <HairTimelineSection key={section.id} data={section.data} />;
    case 'client-journey':
      return <ClientJourneySection key={section.id} data={section.data} />;
    case 'location':
      return <LocationSection key={section.id} data={section.data} />;
    case 'offer-banner':
      return <OfferBannerSection key={section.id} data={section.data} consultationFree={consultationFree} />;
    case 'faq':
      return <FaqSection key={section.id} data={section.data} />;
    case 'comparison':
      return <ComparisonSection key={section.id} data={section.data} consultationFree={consultationFree} />;
    case 'guarantee':
      return <GuaranteeSection key={section.id} data={section.data} />;
    case 'cta':
      return <CtaSection key={section.id} data={section.data} consultationFree={consultationFree} />;
    case 'video-explainer':
      return <VideoSection key={section.id} data={section.data} />;
    case 'form':
      return (
        <FormSection
          key={section.id}
          data={section.data}
          fields={form.fields}
          submitText={form.submitText}
          successMessage={form.successMessage}
          slug={slug}
          variant={variant}
          consultationFree={consultationFree}
        />
      );
    default:
      return null;
  }
}

// An admin adds one treatment at a time (addSection('solution') /
// duplicateSection in the LP builder — each treatment is its own
// standalone 'solution' section, not an array field) — several added back
// to back used to render as a long vertical stack. Grouping consecutive
// VISIBLE 'solution' sections into one BannerCarousel reads as a slider
// instead, with zero change to the admin's existing add-one-at-a-time
// workflow: a lone 'solution' section (nothing else adjacent) still
// renders exactly as before — BannerCarousel's single-slide case is a
// pure passthrough with no nav chrome (see BannerCarousel.tsx).
type SectionGroup = { kind: 'solution-group'; items: LpSection[] } | { kind: 'single'; section: LpSection };

function groupSections(sections: LpSection[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  for (const section of sections) {
    if (!section.visible) continue;
    const last = groups[groups.length - 1];
    if (section.type === 'solution' && last?.kind === 'solution-group') {
      last.items.push(section);
    } else if (section.type === 'solution') {
      groups.push({ kind: 'solution-group', items: [section] });
    } else {
      groups.push({ kind: 'single', section });
    }
  }
  return groups;
}

export default function LpRenderer({ sections, form, slug, variant = 'A', consultationFree }: LpRendererProps) {
  const groups = groupSections(sections);

  return (
    <div>
      {groups.map((group, i) => {
        if (group.kind === 'solution-group') {
          if (group.items.length === 1) {
            return <SolutionSection key={group.items[0].id} data={group.items[0].data} />;
          }
          return (
            <BannerCarousel
              key={`solution-group-${i}`}
              slides={group.items.map((s) => <SolutionSection key={s.id} data={s.data} />)}
            />
          );
        }
        return renderSection(group.section, form, slug, variant, consultationFree);
      })}
    </div>
  );
}
