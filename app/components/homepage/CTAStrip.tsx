import Image from 'next/image';
import Link from 'next/link';
import { MdCheck } from 'react-icons/md';
import { toTelHref } from '@/app/lib/phone';

export default function CTAStrip({ data }: { data: any }) {
  const {
    rewards = {},
    booking = {},
    whyUs = {},
  } = data || {};

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
        {/* COL 1 — REWARDS */}
        <div className="bg-primary text-white rounded-2xl p-5 md:p-7 flex flex-col gap-5">
          <div>
            <h2 className="font-headline font-medium text-2xl">{rewards.title}</h2>
            <p className="text-white/80 text-sm mt-1">{rewards.subtitle}</p>
          </div>
          <ul className="space-y-2.5">
            {(rewards.features || []).map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-champagne flex items-center justify-center shrink-0">
                  <MdCheck size={12} className="text-primary" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          {rewards.ctaText && rewards.ctaHref && rewards.ctaHref !== '#' && (
            <Link href={rewards.ctaHref} className="min-h-11 text-champagne text-sm font-semibold mt-2 hover:underline flex items-center gap-1">
              {rewards.ctaText} →
            </Link>
          )}
        </div>

        {/* COL 2 — BOOK CONSULTATION */}
        <div className="bg-canvas rounded-2xl p-5 md:p-7 flex flex-col justify-between border border-line">
          <div>
            <h2 className="font-headline font-medium text-2xl text-primary">{booking.title}</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{booking.description}</p>
          </div>
          <div className="flex flex-col gap-3 mt-6">
            {booking.ctaPrimary && (
              <Link
                href={booking.ctaPrimary.href || '/book'}
                className="min-h-12 w-full bg-primary text-white font-semibold py-3 px-4 rounded-xl hover:bg-primary-hover transition-colors text-sm flex items-center justify-center"
              >
                {booking.ctaPrimary.text}
              </Link>
            )}
            {booking.ctaSecondary && (
              <a
                href={/^tel:/i.test(booking.ctaSecondary.href || '') ? toTelHref(booking.ctaSecondary.href) : booking.ctaSecondary.href || '/book'}
                className="min-h-12 w-full border border-primary text-primary font-semibold py-3 px-4 rounded-xl hover:bg-line transition-colors text-sm flex items-center justify-center"
              >
                {booking.ctaSecondary.text}
              </a>
            )}
          </div>
        </div>

        {/* COL 3 — WHY US */}
        <div className="bg-canvas rounded-2xl p-5 md:p-7 flex flex-col gap-5 border border-line">
          <h2 className="font-headline font-medium text-2xl text-primary">{whyUs.title}</h2>
          <ul className="space-y-3">
            {(whyUs.reasons || []).map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <MdCheck size={18} className="text-bronze shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
