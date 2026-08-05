import type { Metadata } from 'next';
import Link from 'next/link';
import { getLegalContent } from '@/app/models/LegalContent';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read how DR Youth Clinic collects, uses and protects your personal information across our Chennai, Bangalore, Kochi and Coimbatore clinics.',
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

export const revalidate = 300;

export default async function PrivacyPolicyPage() {
  const legal = await getLegalContent();
  const { lastUpdated, heroSubtitle, sections } = legal.privacyPolicy;
  const contactEmail = legal.contactEmail;

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
            Last updated: <span className="text-white/80 font-medium">{lastUpdated}</span>
          </p>
          <p className="text-white/55 mt-4 max-w-xl text-sm leading-relaxed">{heroSubtitle}</p>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          {sections.map((section) => (
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
              <div
                className="prose prose-sm max-w-none text-gray-600 [&_ul]:space-y-2 [&_ul]:ml-4 [&_li]:list-disc [&_strong]:text-[#0B2560]"
                dangerouslySetInnerHTML={{ __html: section.bodyHtml }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Have a question about your data?{' '}
            <a href={`mailto:${contactEmail}`} className="font-semibold text-[#0B2560] hover:text-[#3B82C4] transition underline underline-offset-2">
              {contactEmail}
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
