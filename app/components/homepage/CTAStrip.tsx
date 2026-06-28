import Image from 'next/image';
import Link from 'next/link';
import { MdCheck } from 'react-icons/md';

export default function CTAStrip({ data }: { data: any }) {
  const {
    rewards = {},
    booking = {},
    whyUs = {},
  } = data || {};

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-3 gap-6">
        {/* COL 1 — REWARDS */}
        <div className="bg-[#0B2560] text-white rounded-2xl p-7 flex flex-col gap-5">
          <div>
            <h3 className="font-headline font-extrabold text-xl">{rewards.title}</h3>
            <p className="text-white/60 text-sm mt-1">{rewards.subtitle}</p>
          </div>
          <ul className="space-y-2.5">
            {(rewards.features || []).map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center shrink-0">
                  <MdCheck size={12} className="text-[#0B2560]" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          {rewards.ctaText && (
            <Link href={rewards.ctaHref || '#'} className="text-[#F5A623] text-sm font-semibold mt-2 hover:underline flex items-center gap-1">
              {rewards.ctaText} →
            </Link>
          )}
        </div>

        {/* COL 2 — BOOK CONSULTATION */}
        <div className="bg-[#f6faff] rounded-2xl p-7 flex flex-col justify-between relative overflow-hidden">
          <div>
            <h3 className="font-headline font-extrabold text-xl text-[#0B2560]">{booking.title}</h3>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{booking.description}</p>
          </div>
          <div className="flex flex-col gap-3 mt-6">
            {booking.ctaPrimary && (
              <Link href={booking.ctaPrimary.href || '/book'}>
                <button className="w-full bg-[#0B2560] text-white font-semibold py-3 rounded-xl hover:bg-[#0d2d73] transition text-sm">
                  {booking.ctaPrimary.text}
                </button>
              </Link>
            )}
            {booking.ctaSecondary && (
              <a href={booking.ctaSecondary.href || 'tel:18008909669'}>
                <button className="w-full border border-[#0B2560] text-[#0B2560] font-semibold py-3 rounded-xl hover:bg-[#e8eff7] transition text-sm">
                  📞 {booking.ctaSecondary.text}
                </button>
              </a>
            )}
          </div>
        </div>

        {/* COL 3 — WHY US */}
        <div className="bg-[#f6faff] rounded-2xl p-7 flex flex-col gap-5">
          <h3 className="font-headline font-extrabold text-xl text-[#0B2560]">{whyUs.title}</h3>
          <ul className="space-y-3">
            {(whyUs.reasons || []).map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <MdCheck size={18} className="text-[#F5A623] shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
