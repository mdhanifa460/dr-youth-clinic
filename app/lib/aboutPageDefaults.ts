export interface AboutSection {
  id: string;
  type: string;
  visible: boolean;
  data: Record<string, any>;
}

export const SECTION_LABELS: Record<string, { label: string; icon: string }> = {
  hero:       { label: 'Hero',                 icon: '🖼️' },
  story:      { label: 'Brand Story',          icon: '📖' },
  timeline:   { label: 'Our Journey Timeline', icon: '📈' },
  values:     { label: 'Mission & Values',     icon: '🎯' },
  leadership: { label: 'Leadership',           icon: '👤' },
  experts:    { label: 'Meet Our Experts',     icon: '👨‍⚕️' },
  technology: { label: 'Technology Showcase',  icon: '🔬' },
  journey:    { label: 'Patient Journey',      icon: '🗺️' },
  gallery:    { label: 'Clinic Experience',    icon: '📸' },
  awards:     { label: 'Awards & Recognition', icon: '🏆' },
  comparison: { label: 'Why Choose Us',        icon: '✅' },
  community:  { label: 'Community Impact',    icon: '🤝' },
  reviews:    { label: 'Patient Reviews',      icon: '💬' },
  faq:        { label: 'FAQ',                  icon: '❓' },
  cta:        { label: 'Final CTA',            icon: '🚀' },
};

export const SECTION_DEFAULTS: Record<string, any> = {
  hero: {
    badge: 'Our Story',
    headline: 'About DR Youth Clinic',
    headlineAccent: 'DR Youth',
    subheading: "South India's Most Trusted Aesthetic Medicine Practice",
    body: "Founded over 15 years ago with a single clinic in Chennai, DR Youth Clinic was built on one principle: that every patient deserves honest, evidence-based care — free from the pressure of upselling.",
    backgroundImage: '',
    stats: [
      { value: '15+', label: 'Years Experience' },
      { value: '50,000+', label: 'Patients Treated' },
      { value: '4.9★', label: 'Average Rating' },
      { value: '4', label: 'Cities' },
    ],
  },
  story: {
    eyebrow: 'Why We Exist',
    headline: 'Every Patient Deserves Honest, Personalised Care',
    body: "Every patient deserves personalised care, evidence-based treatments, and natural-looking results. That's why DR Youth combines experienced specialists with advanced technology to help people feel confident in their skin and hair.",
    image: '',
  },
  timeline: {
    headline: 'Our Journey',
    milestones: [
      { year: '2018', title: 'Clinic Founded', desc: 'Opened our first flagship clinic in Chennai.' },
      { year: '2020', title: '1,000 Patients', desc: 'Crossed our first major patient milestone.' },
      { year: '2022', title: 'New Technology', desc: 'Invested in advanced FDA-cleared equipment.' },
      { year: '2024', title: '25,000+ Patients', desc: 'Grew to serve tens of thousands of happy patients.' },
      { year: '2026', title: '4 Cities', desc: 'Expanded to four flagship clinics across South India.' },
    ],
  },
  values: {
    missionQuote: 'Our commitment: evidence-based treatments, no unnecessary procedures, real results.',
    missionBody: 'We measure success not by the number of treatments we sell, but by how confident and satisfied our patients feel — at every visit and long after.',
    values: [
      { icon: '🔍', title: 'Transparency', desc: 'Complete pricing and honest advice shared before any treatment begins — no hidden costs, no surprises.' },
      { icon: '🛡️', title: 'Safety', desc: 'FDA-cleared equipment, sterile protocols, and board-certified doctors on every procedure.' },
      { icon: '💡', title: 'Innovation', desc: 'We continuously invest in the latest, most effective treatments and technology available.' },
    ],
  },
  leadership: {
    eyebrow: 'Leadership',
    name: '',
    title: '',
    photo: '',
    quote: '',
    bio: '',
  },
  experts: {
    headline: 'Meet the Doctors',
    subheading: 'Every treatment at DR Youth Clinic is led by an experienced, board-certified specialist.',
  },
  technology: {
    headline: 'Advanced Technology',
    subheading: 'We invest in the latest FDA-cleared equipment for safer, more effective treatments.',
    items: [
      { icon: '✨', title: 'HydraFacial', desc: 'Deep cleansing, exfoliation and hydration in a single, non-invasive session.' },
      { icon: '⚡', title: 'Laser Systems', desc: 'FDA-cleared lasers for hair removal, pigmentation and skin resurfacing.' },
      { icon: '💉', title: 'PRP / GFC', desc: 'Advanced regenerative treatments using your own blood for natural hair and skin restoration.' },
    ],
  },
  journey: {
    headline: 'Your Treatment Journey',
    steps: [
      { icon: '📅', title: 'Book', desc: 'Schedule your free consultation online or by phone.' },
      { icon: '🩺', title: 'Consultation', desc: 'Meet your specialist and discuss your goals.' },
      { icon: '🔬', title: 'Skin / Hair Analysis', desc: 'A thorough assessment of your unique condition.' },
      { icon: '📋', title: 'Treatment Plan', desc: 'A personalised protocol built just for you.' },
      { icon: '💆', title: 'Procedure', desc: 'Expert-administered treatment in a safe, sterile environment.' },
      { icon: '🌿', title: 'Recovery', desc: 'Guided aftercare so you heal safely and comfortably.' },
      { icon: '✨', title: 'Results', desc: 'Visible, natural-looking results you can be confident in.' },
    ],
  },
  gallery: {
    headline: 'Inside Our Clinics',
    subheading: 'A look at the environment where your care journey happens.',
    images: [],
  },
  awards: {
    headline: 'Awards & Recognition',
    awards: [
      { year: '', icon: '🏅', title: 'ISO Certified', desc: 'Quality Management System' },
      { year: '', icon: '🏥', title: 'NABH Compliant', desc: 'National Accreditation Board' },
      { year: '', icon: '👨‍⚕️', title: 'IADVL Member', desc: 'Indian Assoc. of Dermatologists' },
    ],
  },
  comparison: {
    headline: 'Why Choose DR Youth Clinic',
    items: [
      'Personalised consultation for every patient',
      'Advanced, FDA-cleared technology',
      'Board-certified, experienced specialists',
      'Tailored treatment plans — never one-size-fits-all',
      'Dedicated follow-up and aftercare',
    ],
  },
  community: {
    headline: 'Community Impact',
    items: [
      { icon: '🎗️', title: 'Awareness Programs', desc: 'Skin and hair health education for the communities we serve.' },
      { icon: '🏕️', title: 'Free Consultation Camps', desc: 'Periodic camps offering free consultations to underserved communities.' },
    ],
  },
  reviews: {},
  faq: {
    headline: 'Common Questions',
    subheading: 'Have more questions? Visit our full FAQ page.',
  },
  cta: {
    headline: '',
    subtext: 'Speak with one of our specialists — no commitment, no pressure. Just honest advice tailored to you.',
    ctaText: '',
    ctaHref: '/book',
  },
};

export const DEFAULT_SECTION_ORDER = [
  'hero', 'story', 'timeline', 'values', 'leadership', 'experts', 'technology',
  'journey', 'gallery', 'awards', 'comparison', 'community', 'reviews', 'faq', 'cta',
];

export function makeDefaultAboutSections(): AboutSection[] {
  return DEFAULT_SECTION_ORDER.map((type, i) => ({
    id: `${type}-${i}`,
    type,
    visible: true,
    data: JSON.parse(JSON.stringify(SECTION_DEFAULTS[type] ?? {})),
  }));
}
