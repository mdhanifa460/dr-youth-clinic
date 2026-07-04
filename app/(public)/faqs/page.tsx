import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { FAQSchema } from '@/app/components/SchemaMarkup';
import FAQPageClient from './FAQPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'FAQs | DR Youth Clinic — Skin, Hair & Laser Treatments',
  description:
    'Get answers to the most common questions about skin, hair and laser treatments at DR Youth Clinic. Everything from pricing and safety to recovery time and booking.',
  alternates: { canonical: `${SITE_URL}/faqs` },
  openGraph: {
    title: 'Frequently Asked Questions | DR Youth Clinic',
    description:
      'Answers to your questions about dermatology, laser, hair and skin treatments in Chennai, Bangalore, Kochi and Coimbatore.',
    url: 'https://dryouthclinic.com/faqs',
    siteName: 'DR Youth Clinic',
    type: 'website',
  },
};

const getCmsFaqs = unstable_cache(
  async () => {
    try {
      await connectDB();
      const section = await HomepageSection.findOne({ sectionKey: 'faq' } as any).lean() as any;
      return (section?.data?.faqs ?? []) as { question: string; answer: string }[];
    } catch {
      return [];
    }
  },
  ['cms-faqs'],
  { revalidate: 300, tags: ['homepage-layout'] }
);

// ─── Static categorized FAQs ──────────────────────────────
const STATIC_FAQS: { category: string; icon: string; items: { question: string; answer: string }[] }[] = [
  {
    category: 'General',
    icon: '🏥',
    items: [
      {
        question: 'What treatments does DR Youth Clinic offer?',
        answer:
          'We offer a full range of advanced dermatology and aesthetic treatments including skin rejuvenation, acne and scar treatments, anti-ageing procedures, laser hair removal, hair loss treatments (PRP, GFC, hair transplant), chemical peels, HydraFacial, Botox, fillers, and more. All treatments are performed by certified dermatologists.',
      },
      {
        question: 'Are your doctors certified dermatologists?',
        answer:
          'Yes. Every treatment at DR Youth Clinic is performed or directly supervised by a board-certified dermatologist or aesthetic physician. We do not allow technicians to perform procedures — your safety is our top priority.',
      },
      {
        question: 'Do you offer a free consultation?',
        answer:
          'Yes, we offer a free first consultation for most treatments. Our doctors will evaluate your skin or scalp condition, discuss your goals, and recommend a personalised treatment plan — with no obligation.',
      },
      {
        question: 'How do I choose the right treatment for me?',
        answer:
          'Book a consultation and our specialist will assess your concern, review your medical history, and recommend the most effective treatment for your unique skin type and goals. We never recommend treatments you don\'t need.',
      },
      {
        question: 'Which cities do you have clinics in?',
        answer:
          'We have flagship clinics in Chennai, Bangalore, Kochi, and Coimbatore — all maintaining the same high standard of care and equipment.',
      },
    ],
  },
  {
    category: 'Skin Treatments',
    icon: '✨',
    items: [
      {
        question: 'What skin conditions do you treat?',
        answer:
          'We treat acne, pigmentation, melasma, dark circles, open pores, dull skin, uneven texture, acne scars, stretch marks, eczema, psoriasis, rosacea, and signs of ageing including fine lines and sagging.',
      },
      {
        question: 'What is the best treatment for acne scars?',
        answer:
          'The most effective acne scar treatments include microneedling RF (radiofrequency), CO2 laser resurfacing, subcision, chemical peels, and dermal fillers depending on scar type. Our doctors combine these for optimal results in a customised protocol.',
      },
      {
        question: 'How many HydraFacial sessions do I need?',
        answer:
          'For maintenance and glow, a single session works great. For targeting specific concerns like pigmentation, clogged pores or congestion, we recommend 4-6 sessions spaced 2-4 weeks apart.',
      },
      {
        question: 'Is chemical peel safe for Indian/dark skin?',
        answer:
          'Yes — when performed by a trained dermatologist using the right formulation and concentration. At DR Youth Clinic, we tailor peel depth and type to your Fitzpatrick skin type to prevent post-inflammatory hyperpigmentation.',
      },
      {
        question: 'What is the best treatment for pigmentation and melasma?',
        answer:
          'Melasma treatment typically combines topical agents (prescribed by our dermatologist), chemical peels, and Q-switch laser. Melasma requires ongoing management — our doctors will design a maintenance plan to prevent recurrence.',
      },
    ],
  },
  {
    category: 'Hair Treatments',
    icon: '💆',
    items: [
      {
        question: 'Is PRP treatment effective for hair loss?',
        answer:
          'PRP (Platelet Rich Plasma) is clinically proven to stimulate hair follicles and slow hair loss. Most patients see visible improvement after 4-6 sessions. Results are best maintained with regular top-up sessions every 4-6 months.',
      },
      {
        question: 'What is the difference between PRP and GFC therapy?',
        answer:
          'Both use your own blood. GFC (Growth Factor Concentrate) extracts a higher concentration of growth factors than standard PRP, making it more potent. GFC typically shows faster and more significant results with fewer sessions required.',
      },
      {
        question: 'How many sessions of hair treatment will I need?',
        answer:
          'For PRP or GFC, we typically recommend 6 sessions over 3-4 months for an initial course. Maintenance sessions are then scheduled every 4-6 months. The exact protocol depends on your hair loss type and stage.',
      },
      {
        question: 'Is hair transplant permanent?',
        answer:
          'Yes. Hair transplanted from the donor area (back of the scalp) is genetically resistant to DHT — the hormone that causes baldness — so it remains permanent. However, existing native hair may continue to thin, which may require medical management.',
      },
      {
        question: 'What causes hair loss in women?',
        answer:
          'Female hair loss is often caused by hormonal imbalances (PCOD, thyroid issues), nutritional deficiencies (iron, B12, zinc), post-pregnancy changes, stress, or hereditary pattern hair loss. Our specialists run targeted blood tests to identify the root cause before recommending treatment.',
      },
    ],
  },
  {
    category: 'Laser Treatments',
    icon: '⚡',
    items: [
      {
        question: 'How many laser hair removal sessions will I need?',
        answer:
          'Most areas require 6-8 sessions for up to 90% permanent reduction. Hair grows in cycles, and laser only targets active growth phase — hence multiple sessions are needed. Sessions are spaced 4-6 weeks apart.',
      },
      {
        question: 'Is laser hair removal safe for Indian skin?',
        answer:
          'Yes — we use diode and Nd:YAG lasers specifically approved for darker skin tones (Fitzpatrick III-VI). These wavelengths bypass the epidermis and target the follicle directly, making them safe and effective for Indian skin types.',
      },
      {
        question: 'Does laser hair removal hurt?',
        answer:
          'Modern laser systems include integrated cooling that minimises discomfort. Most patients describe the sensation as a light rubber-band snap. We also offer numbing cream for sensitive areas on request.',
      },
      {
        question: 'What areas can be treated with laser hair removal?',
        answer:
          'We treat full body including face (upper lip, chin, sideburns), underarms, arms, legs, back, chest, bikini, and Brazilian. Full-body packages are available at bundled pricing.',
      },
      {
        question: 'What is the difference between Q-Switch and CO2 laser?',
        answer:
          'Q-Switch laser targets pigment and melanin — ideal for tattoo removal, pigmentation, and skin brightening. CO2 laser resurfaces the entire skin surface — ideal for deep scars, wrinkles, and skin rejuvenation. Our doctors will recommend the right laser for your concern.',
      },
    ],
  },
  {
    category: 'Pricing & EMI',
    icon: '💰',
    items: [
      {
        question: 'How much do treatments cost?',
        answer:
          'Pricing varies by treatment, number of sessions, and area being treated. We believe in full transparency — exact pricing is shared during your consultation before any commitment. Package deals are available for multiple session treatments.',
      },
      {
        question: 'Do you offer EMI or instalment payment options?',
        answer:
          'Yes. We offer 0% EMI on HDFC, ICICI, and Axis Bank credit cards for 3, 6, 12, and 24 month tenures. No-cost EMI makes advanced treatments accessible without financial stress.',
      },
      {
        question: 'Are treatment prices all-inclusive?',
        answer:
          'Yes. The price quoted covers the full treatment session. There are no hidden consultation fees, consumable charges, or post-treatment surprise costs. What you are quoted is what you pay.',
      },
      {
        question: 'Does health insurance cover aesthetic treatments?',
        answer:
          'Most cosmetic and aesthetic treatments are not covered by standard health insurance. However, some medically necessary dermatology treatments (severe eczema, psoriasis, alopecia) may be partially covered — check with your insurer. We provide detailed invoices for all treatments.',
      },
    ],
  },
  {
    category: 'Safety & Results',
    icon: '🛡️',
    items: [
      {
        question: 'Are treatments safe for all skin types?',
        answer:
          'We assess each patient\'s skin type, medical history, and current medications before recommending any treatment. Our dermatologists are trained to adapt protocols for all skin types — from very fair to very dark — ensuring safety is never compromised.',
      },
      {
        question: 'Is the treatment painful?',
        answer:
          'Most treatments at DR Youth Clinic involve minimal to no discomfort. Topical numbing creams are applied before procedures like laser, microneedling, and injections. Our team prioritises your comfort throughout.',
      },
      {
        question: 'What is the recovery time after treatment?',
        answer:
          'Recovery varies by treatment. Non-invasive facials have zero downtime. Laser and peels may cause 1-3 days of redness. Surgical procedures like hair transplant require 5-7 days off work. Your doctor will brief you on aftercare specific to your treatment.',
      },
      {
        question: 'How long do results last?',
        answer:
          'Results depend on the treatment and individual factors. Laser hair removal results are permanent after completion. Skin treatments like HydraFacial last 4-6 weeks. Anti-ageing treatments (Botox, fillers) last 6-18 months. Hair loss treatments benefit from maintenance sessions.',
      },
      {
        question: 'Are there any side effects?',
        answer:
          'All procedures are performed by qualified doctors and carry minimal risk when done correctly. Common temporary side effects include mild redness, swelling, or sensitivity lasting 24-72 hours. Serious side effects are rare. Your doctor will discuss all risks during consultation.',
      },
    ],
  },
  {
    category: 'Booking',
    icon: '📅',
    items: [
      {
        question: 'Can I book an appointment online?',
        answer:
          'Yes. You can book online 24/7 through our website. Select your treatment, preferred location, and time slot. Alternatively, call us directly or WhatsApp us for assistance.',
      },
      {
        question: 'How do I prepare for my first consultation?',
        answer:
          'No special preparation is needed. Arrive with clean skin (no heavy makeup if possible), bring a list of any current medications or supplements, and note down any allergies or past skin conditions. The consultation typically takes 20-30 minutes.',
      },
      {
        question: 'Can I cancel or reschedule my appointment?',
        answer:
          'Yes. We request at least 24 hours notice for cancellations or rescheduling. Contact us via phone or WhatsApp and we will find the next available slot that suits you.',
      },
      {
        question: 'Do I need to stop any medications before treatment?',
        answer:
          'Certain medications like blood thinners, retinoids, or specific antibiotics may need to be paused before some procedures. Your doctor will review your medication list during consultation and advise accordingly.',
      },
    ],
  },
];

export default async function FAQPage() {
  const cmsFaqs = await getCmsFaqs();

  // Merge CMS FAQs into the "General" category if not already present
  const allFaqs = STATIC_FAQS.map((cat) => {
    if (cat.category !== 'General') return cat;
    const existingQuestions = new Set(cat.items.map((i) => i.question));
    const newItems = cmsFaqs.filter((f) => !existingQuestions.has(f.question));
    return { ...cat, items: [...newItems, ...cat.items] };
  });

  const allFlatFaqs = allFaqs.flatMap((c) => c.items);

  return (
    <>
      <FAQSchema faqs={allFlatFaqs.slice(0, 20)} />
      <FAQPageClient categories={allFaqs} />
    </>
  );
}
