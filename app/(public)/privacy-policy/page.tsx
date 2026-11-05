import type { Metadata } from 'next';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Camera, ClipboardList, Clock, Cookie, FileCheck, FileText, Lock, Mail, Scale, Shield, Target,
} from 'lucide-react';
import { isPublishableSection } from '@/app/lib/legalDraftSections';
import { getLegalContent } from '@/app/models/LegalContent';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read how DR Youth Clinic collects, uses and protects your personal information across our Chennai, Bangalore, Kochi and Coimbatore clinics.',
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

export const revalidate = 300;

// Section text and ids come from Admin -> Legal, which remains the only source of
// policy wording. Everything defined here is navigation, and must not add commitments.
const SECTION_ICONS: [RegExp, LucideIcon][] = [
  [/consent/i, FileCheck],
  [/photo/i, Camera],
  [/confiden|security/i, Lock],
  [/collect/i, ClipboardList],
  [/how we use|use your/i, Target],
  [/retention|keep/i, Clock],
  [/cookie|analytics/i, Cookie],
  [/rights/i, Scale],
  [/contact/i, Mail],
  [/overview/i, FileText],
];
const iconFor = (title: string) => SECTION_ICONS.find(([re]) => re.test(title))?.[1] ?? Shield;

const OVERVIEW_CARDS: { match: RegExp; icon: LucideIcon; title: string; text: string }[] = [
  { match: /collect/i, icon: ClipboardList, title: 'What we collect', text: 'The details we may ask for when you book, visit or contact us.' },
  { match: /how we use|use your/i, icon: Target, title: 'How we use it', text: 'Why your information is used, and who can access it.' },
  { match: /retention|keep/i, icon: Clock, title: 'How long we keep it', text: 'How long each type of record is held.' },
  { match: /rights/i, icon: Scale, title: 'Your rights', text: 'What you can ask us to do with your information.' },
];

const BODY_STYLES =
  'space-y-3 text-[15px] leading-relaxed text-text-secondary break-words [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-primary [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2';

export default async function PrivacyPolicyPage() {
  const legal = await getLegalContent();
  const { lastUpdated, heroSubtitle, sections: allSections } = legal.privacyPolicy;
  const sections = allSections.filter(isPublishableSection);
  const contactEmail = legal.contactEmail;
  const rightsSection = sections.find((s) => /rights/i.test(s.title));

  const cards = OVERVIEW_CARDS.flatMap((card) => {
    const section = sections.find((s) => card.match.test(s.title));
    return section ? [{ ...card, href: `#${section.id}` }] : [];
  });

  return (
    <div>
      <section className="bg-primary py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="eyebrow !text-champagne mb-3">Legal</p>
          <h1 className="font-headline text-4xl font-medium leading-tight text-white md:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-white/80">
            Last updated: <span className="font-medium text-white">{lastUpdated}</span>
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85">{heroSubtitle}</p>
        </div>
      </section>

      {cards.length > 0 && (
        <section aria-labelledby="privacy-overview" className="border-b border-line bg-white py-8 md:py-12">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 id="privacy-overview" className="eyebrow mb-4">At a glance</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {cards.map(({ icon: Icon, title, text, href }) => (
                <a key={title} href={href} className="group rounded-2xl border border-line bg-canvas p-5 transition-colors hover:border-primary">
                  <Icon size={22} className="text-bronze" aria-hidden="true" />
                  <span className="mt-3 block font-headline text-xl font-medium text-primary group-hover:underline">{title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-text-secondary">{text}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-canvas py-8 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Privacy policy sections" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="eyebrow mb-3">In this policy</p>
              <ul className="space-y-1 border-l border-line">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="-ml-px block min-h-9 border-l-2 border-transparent py-1.5 pl-3 text-sm leading-snug text-text-secondary hover:border-primary hover:text-primary">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="min-w-0 space-y-4 md:space-y-5">
            {sections.map((section) => {
              const Icon = iconFor(section.title);
              return (
                <article key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 md:p-8">
                  <div className="mb-4 flex items-start gap-3">
                    <Icon size={22} className="mt-1 shrink-0 text-bronze" aria-hidden="true" />
                    <h2 className="font-headline text-2xl font-medium leading-snug text-primary">{section.title}</h2>
                  </div>
                  <div className={BODY_STYLES} dangerouslySetInnerHTML={{ __html: section.bodyHtml }} />
                </article>
              );
            })}

            <section aria-labelledby="privacy-request" className="scroll-mt-24 rounded-2xl bg-primary p-5 text-white md:p-8" id="make-a-request">
              <h2 id="privacy-request" className="font-headline text-2xl font-medium">How to make a privacy request</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-white/90">
                <li>
                  Email us at{' '}
                  <a href={`mailto:${contactEmail}`} className="break-all font-semibold text-white underline underline-offset-2">{contactEmail}</a>.
                </li>
                <li>Tell us which of your rights you want to use, and what your request is about.</li>
                <li>
                  We will reply as described in{' '}
                  {rightsSection
                    ? <a href={`#${rightsSection.id}`} className="font-semibold text-white underline underline-offset-2">{rightsSection.title}</a>
                    : 'this policy'}.
                </li>
              </ol>
            </section>

            <p className="pt-2 text-sm text-text-secondary">
              See also our{' '}
              <Link href="/terms" className="font-medium text-primary underline underline-offset-2">Terms of Service</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white py-8 md:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p className="text-sm text-text-secondary">
            Have a question about your data?{' '}
            <a href={`mailto:${contactEmail}`} className="break-all font-semibold text-primary underline underline-offset-2">{contactEmail}</a>
          </p>
          <Link href="/book" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover">
            Book a Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
