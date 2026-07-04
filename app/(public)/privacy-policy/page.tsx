import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Privacy Policy | DR Youth Clinic',
  description:
    'Read how DR Youth Clinic collects, uses and protects your personal information across our Chennai, Bangalore, Kochi and Coimbatore clinics.',
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

const LAST_UPDATED = 'January 2025';
const CONTACT_EMAIL = 'hello@dryouthclinic.com';

const SECTIONS = [
  {
    id: 'collect',
    icon: '📋',
    title: 'What Information We Collect',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>When you book a consultation, contact us or browse our website, we may collect the following:</p>
        <ul className="space-y-2 ml-4">
          {[
            { field: 'Full Name', why: 'to address you correctly and maintain patient records' },
            { field: 'Phone Number', why: 'to confirm appointments and send WhatsApp reminders' },
            { field: 'Email Address', why: 'to send booking confirmations and follow-up care tips' },
            { field: 'Health Concern', why: 'to match you with the right specialist and treatment' },
            { field: 'Location / City', why: 'to route your booking to the nearest clinic' },
          ].map(({ field, why }) => (
            <li key={field} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2560] mt-2 shrink-0" />
              <span>
                <span className="font-semibold text-[#0B2560]">{field}</span>
                {' — '}
                {why}.
              </span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'use',
    icon: '🔍',
    title: 'How We Use Your Information',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>Your information is used solely to provide and improve our services:</p>
        <ul className="space-y-2 ml-4">
          {[
            'Appointment booking, scheduling and reminders via call or WhatsApp.',
            'Sending post-treatment care instructions and follow-up messages.',
            'Personalising your experience across our four clinic locations.',
            'Responding to enquiries submitted through our website or forms.',
            'Improving our services based on anonymised usage patterns.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-2 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-semibold text-[#0B2560]">
          We do not sell, rent or share your personal data with third parties for marketing purposes.
        </p>
      </div>
    ),
  },
  {
    id: 'retention',
    icon: '🗄️',
    title: 'Data Retention',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>
          Medical and consultation records are retained for a minimum of{' '}
          <span className="font-semibold text-[#0B2560]">3 years</span> from the date of your last visit, in compliance with applicable Indian healthcare regulations.
        </p>
        <p>
          Non-medical contact data (e.g. enquiry form submissions) may be retained for up to 12 months or until you request deletion, whichever is sooner.
        </p>
        <p>
          After the applicable retention period, data is securely deleted or anonymised.
        </p>
      </div>
    ),
  },
  {
    id: 'cookies',
    icon: '🍪',
    title: 'Cookies & Analytics',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>Our website uses the following third-party analytics and tracking tools to understand site usage and improve your experience:</p>
        <ul className="space-y-3 ml-4">
          {[
            { tool: 'Google Analytics 4 (GA4)', desc: 'Collects anonymised page view and session data to help us understand how visitors use our site.' },
            { tool: 'Meta Pixel', desc: 'Enables us to measure the effectiveness of our Facebook and Instagram ads and to reach relevant audiences.' },
            { tool: 'Microsoft Clarity', desc: 'Records anonymised session recordings and heatmaps to identify usability improvements.' },
          ].map(({ tool, desc }) => (
            <li key={tool} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2560] mt-2 shrink-0" />
              <span>
                <span className="font-semibold text-[#0B2560]">{tool}</span>
                {' — '}
                {desc}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          You may disable cookies at any time through your browser settings. Note that some website features may not function correctly if cookies are disabled.
        </p>
      </div>
    ),
  },
  {
    id: 'rights',
    icon: '⚖️',
    title: 'Your Rights',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>You have the right to:</p>
        <ul className="space-y-2 ml-4">
          {[
            'Access the personal data we hold about you.',
            'Request correction of inaccurate or incomplete data.',
            'Request deletion of your data (subject to medical retention requirements).',
            'Withdraw consent for marketing communications at any time.',
            'Lodge a complaint with us if you believe your data has been misused.',
          ].map((right) => (
            <li key={right} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-2 shrink-0" />
              <span>{right}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          To exercise any of these rights, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#0B2560] underline underline-offset-2 hover:text-[#3B82C4] transition">
            {CONTACT_EMAIL}
          </a>
          . We aim to respond within 7 business days.
        </p>
      </div>
    ),
  },
  {
    id: 'contact',
    icon: '✉️',
    title: 'Contact Us',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>
          For any questions, concerns or requests regarding this Privacy Policy or your personal data, please contact our privacy team:
        </p>
        <p>
          <span className="font-semibold text-[#0B2560]">Email: </span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#0B2560] underline underline-offset-2 hover:text-[#3B82C4] transition font-semibold">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>
          <span className="font-semibold text-[#0B2560]">Clinics: </span>
          Chennai · Bangalore · Kochi · Coimbatore
        </p>
        <p className="text-xs text-gray-400 mt-4">
          DR Youth Clinic reserves the right to update this policy periodically. Material changes will be notified via our website.
        </p>
      </div>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main>
      {/* ── HERO ── */}
      <section className="bg-[#0B2560] py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Legal</p>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-white leading-tight">
            Privacy Policy
          </h1>
          <p className="text-white/60 mt-3 text-sm">
            Last updated: <span className="text-white/80 font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="text-white/55 mt-4 max-w-xl text-sm leading-relaxed">
            DR Youth Clinic is committed to protecting your privacy. This policy explains how we collect, use and safeguard your personal information.
          </p>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-3xl p-7 md:p-9 ring-1 ring-[#e8eff7] shadow-sm"
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl shrink-0">{section.icon}</span>
                <h2 className="text-lg md:text-xl font-headline font-bold text-[#0B2560] leading-snug">
                  {section.title}
                </h2>
              </div>
              {section.content}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Have a question about your data?{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#0B2560] hover:text-[#3B82C4] transition underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
          </p>
          <Link
            href="/book"
            className="shrink-0 inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition"
          >
            Book a Consultation →
          </Link>
        </div>
      </section>
    </main>
  );
}
