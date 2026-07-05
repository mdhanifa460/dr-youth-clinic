'use client';

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
}

function renderSection(section: LpSection, form: LpRendererProps['form'], slug: string, variant: 'A' | 'B') {
  if (!section.visible) return null;

  switch (section.type) {
    case 'hero':
      return <HeroSection key={section.id} data={section.data} slug={slug} />;
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
    case 'location':
      return <LocationSection key={section.id} data={section.data} />;
    case 'offer-banner':
      return <OfferBannerSection key={section.id} data={section.data} />;
    case 'faq':
      return <FaqSection key={section.id} data={section.data} />;
    case 'comparison':
      return <ComparisonSection key={section.id} data={section.data} />;
    case 'guarantee':
      return <GuaranteeSection key={section.id} data={section.data} />;
    case 'cta':
      return <CtaSection key={section.id} data={section.data} />;
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
        />
      );
    default:
      return null;
  }
}

export default function LpRenderer({ sections, form, slug, variant = 'A' }: LpRendererProps) {
  return (
    <div>
      {sections.map((section) => renderSection(section, form, slug, variant))}
    </div>
  );
}
