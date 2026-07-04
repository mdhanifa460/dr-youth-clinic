import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Terms of Service | DR Youth Clinic',
  description:
    'Terms and conditions governing appointments, treatments, payments and content at DR Youth Clinic — serving Chennai, Bangalore, Kochi and Coimbatore.',
  alternates: { canonical: `${SITE_URL}/terms` },
};

const LAST_UPDATED = 'January 2025';
const CONTACT_EMAIL = 'hello@dryouthclinic.com';

const SECTIONS = [
  {
    id: 'appointments',
    icon: '📅',
    title: 'Appointment Booking',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>
          All appointments at DR Youth Clinic are subject to the following conditions:
        </p>
        <ul className="space-y-2 ml-4">
          {[
            'Bookings are only confirmed once you receive a WhatsApp or SMS confirmation from our team.',
            'A minimum of 24 hours\' notice is required to cancel or reschedule an appointment without penalty.',
            'Late cancellations (within 24 hours) or no-shows may result in a cancellation fee or loss of priority booking status.',
            'Walk-in availability is subject to doctor schedules and cannot be guaranteed.',
            'DR Youth Clinic reserves the right to reschedule appointments due to unforeseen clinical circumstances. Patients will be notified as early as possible.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2560] mt-2 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'disclaimer',
    icon: '⚕️',
    title: 'Medical Disclaimer',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>
          Aesthetic and dermatological treatments are inherently individual in nature. By using our services, you acknowledge the following:
        </p>
        <ul className="space-y-2 ml-4">
          {[
            'Results vary from person to person depending on skin type, age, lifestyle and adherence to aftercare instructions.',
            'No specific outcome is guaranteed. Treatment plans are recommendations based on clinical assessment.',
            'All treatments require a prior consultation with a qualified doctor. No procedure will be carried out without informed consent.',
            'Information on our website is for general awareness only and does not constitute medical advice.',
            'If you have an existing medical condition, please disclose it fully during consultation — it may affect treatment suitability.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-2 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'payment',
    icon: '💳',
    title: 'Payment Policy',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>
          The following payment terms apply to all services provided at DR Youth Clinic:
        </p>
        <ul className="space-y-2 ml-4">
          {[
            'Full payment is due at the time of treatment, prior to the procedure being carried out.',
            'We accept cash, UPI, debit/credit cards and select digital wallets. EMI options may be available — ask at the front desk.',
            'Package payments must be made in full at the time of purchase unless a payment plan is agreed in writing.',
            'Completed treatments are non-refundable. If a treatment session has been administered, no refund will be issued for that session regardless of outcome.',
            'If a package is partially used and discontinued at the patient\'s request, any refund for unused sessions is at the clinic\'s discretion, minus a 15% administrative fee.',
            'Promotions and offer prices cannot be applied retrospectively to already-paid bookings.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2560] mt-2 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'content',
    icon: '📸',
    title: 'Before / After Content',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>
          DR Youth Clinic may capture and use before-and-after photographs or videos for clinical records, educational and marketing purposes, subject to the following:
        </p>
        <ul className="space-y-2 ml-4">
          {[
            'Before/after content is captured and published only with the patient\'s explicit written consent, obtained at the time of the visit.',
            'Consent may be withdrawn at any time by writing to us at hello@dryouthclinic.com. Previously published content will be removed within 7 business days.',
            'All published patient images are anonymised or used with the patient\'s knowledge and approval.',
            'Content shared by patients about DR Youth Clinic on social media may be reposted or featured with due credit, unless the patient requests otherwise.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-2 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'governing-law',
    icon: '⚖️',
    title: 'Governing Law',
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>
          These Terms of Service are governed by and construed in accordance with the laws of{' '}
          <span className="font-semibold text-[#0B2560]">Tamil Nadu, India</span>.
        </p>
        <p>
          Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.
        </p>
        <p>
          DR Youth Clinic reserves the right to update these terms at any time. Continued use of our services following any update constitutes acceptance of the revised terms.
        </p>
        <p>
          For questions or concerns, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#0B2560] underline underline-offset-2 hover:text-[#3B82C4] transition">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    ),
  },
];

export default function TermsPage() {
  return (
    <main>
      {/* ── HERO ── */}
      <section className="bg-[#0B2560] py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Legal</p>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-white leading-tight">
            Terms of Service
          </h1>
          <p className="text-white/60 mt-3 text-sm">
            Last updated: <span className="text-white/80 font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="text-white/55 mt-4 max-w-xl text-sm leading-relaxed">
            By booking an appointment or using any DR Youth Clinic service, you agree to the terms set out below. Please read them carefully.
          </p>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          {/* Quick nav */}
          <div className="bg-white rounded-2xl p-5 ring-1 ring-[#e8eff7] shadow-sm">
            <p className="text-xs font-bold text-[#0B2560] uppercase tracking-widest mb-3">Jump to Section</p>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-xs font-semibold text-[#0B2560] bg-[#f6faff] hover:bg-[#e8eff7] px-3 py-1.5 rounded-full transition border border-[#e8eff7]"
                >
                  {s.icon} {s.title}
                </a>
              ))}
            </div>
          </div>

          {SECTIONS.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-3xl p-7 md:p-9 ring-1 ring-[#e8eff7] shadow-sm scroll-mt-24"
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
            Questions about these terms?{' '}
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
