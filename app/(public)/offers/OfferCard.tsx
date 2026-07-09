import Link from 'next/link';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Skin Care': 'from-pink-400 to-rose-500',
  'Hair Care': 'from-emerald-400 to-teal-500',
  'Laser':     'from-violet-400 to-purple-600',
  'Body':      'from-orange-400 to-amber-500',
  'Package':   'from-[#3B82C4] to-[#0B2560]',
};

const CATEGORY_ICON: Record<string, string> = {
  'Skin Care': '✨',
  'Hair Care': '🌿',
  'Laser':     '⚡',
  'Body':      '💆',
  'Package':   '🎁',
};

export function discountPct(orig: number, disc: number) {
  if (!orig || !disc || orig <= disc) return 0;
  return Math.round(((orig - disc) / orig) * 100);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OfferCard({ offer }: { offer: any }) {
  const pct = discountPct(offer.originalPrice, offer.discountedPrice);
  const savings = offer.originalPrice - offer.discountedPrice;
  const gradient = CATEGORY_GRADIENTS[offer.category] || CATEGORY_GRADIENTS['Package'];
  const icon = CATEGORY_ICON[offer.category] || '🏷️';
  const isExpired = offer.validUntil && new Date(offer.validUntil) < new Date();

  return (
    <div className={`group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col ${isExpired ? 'opacity-60' : ''}`}>
      {/* Top image / gradient strip */}
      <div className={`relative h-40 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {offer.image?.url ? (
          <img src={offer.image.url} alt={offer.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-6xl opacity-40">{icon}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold text-gray-700 px-2.5 py-1 rounded-full">
            {icon} {offer.category}
          </span>
          {offer.badge && (
            <span className="bg-[#F5A623] text-[#0B2560] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">
              {offer.badge}
            </span>
          )}
        </div>
        {pct > 0 && (
          <div className="absolute bottom-3 right-3 bg-green-500 text-white text-sm font-extrabold w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg">
            <span className="text-xs leading-none">Save</span>
            <span className="leading-none">{pct}%</span>
          </div>
        )}
        {isExpired && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-full">Expired</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-base font-extrabold text-[#0B2560] leading-snug mb-2 group-hover:text-[#3B82C4] transition-colors">
          {offer.title}
        </h3>
        {offer.description && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{offer.description}</p>
        )}

        {/* Features */}
        {offer.features?.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {offer.features.slice(0, 4).map((f: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle size={13} className="text-green-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="flex-1" />

        {/* Pricing */}
        <div className="border-t border-gray-100 pt-4 mt-2">
          <div className="flex items-end gap-3 mb-1">
            <span className="text-gray-400 text-sm line-through">₹{offer.originalPrice?.toLocaleString('en-IN')}</span>
            <span className="text-2xl font-extrabold text-[#0B2560] leading-none">₹{offer.discountedPrice?.toLocaleString('en-IN')}</span>
          </div>
          {savings > 0 && (
            <p className="text-xs text-green-600 font-semibold mb-3">
              You save ₹{savings.toLocaleString('en-IN')}
            </p>
          )}
          {offer.validUntil && !isExpired && (
            <p className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold mb-3">
              <Clock size={10} /> Valid until {formatDate(offer.validUntil)}
            </p>
          )}
          <Link
            href={`/book?offer=${encodeURIComponent(offer.title)}`}
            className="w-full flex items-center justify-center gap-2 bg-[#F5A623] text-[#0B2560] py-3 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            <Calendar size={14} /> Book This Offer
          </Link>
          {offer.terms && (
            <p className="text-[10px] text-gray-400 leading-relaxed mt-3">*{offer.terms}</p>
          )}
        </div>
      </div>
    </div>
  );
}
