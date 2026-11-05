import ImageWithFallback from '@/app/components/media/ImageWithFallback';
import Link from 'next/link';
import { toWhatsAppNumber } from '@/app/lib/phone';
import { ArrowRight, FileText, CalendarCheck, Phone, MessageCircle } from 'lucide-react';

export interface ServicesCardsCategory {
  slug: string;
  label: string;
  tagline: string;
  icon: string;
  heroGrad: string;
  accentColor: string;
}

export interface QuickService { name: string; slug: string }

// Admin-configurable (Homepage → Services Cards → Quick Menu). Every field
// is optional — a missing/older saved config resolves to these defaults.
export interface QuickMenuConfig {
  enabled?: boolean;
  showServices?: boolean;
  minServices?: number;
  maxServices?: number;
  details?: { enabled?: boolean; label?: string };
  book?: { enabled?: boolean; label?: string; href?: string };
  contact?: { enabled?: boolean; label?: string; type?: 'call' | 'whatsapp' | 'link'; href?: string };
}

export interface ServicesCardsProps {
  data: any;
  location?: string;
  categoryCounts?: Record<string, number>;
  // DB-backed (Category model, via getCachedCategories()) — same live
  // source as the Services Hub page, so a category rename/reorder from
  // Settings → Service Categories shows up here too instead of only on
  // the hub. categoryImages/categoryCounts stay keyed by `slug`, which
  // is stable across that admin-managed source (default seed keeps the
  // original skin/hair/laser/other slugs).
  categories: ServicesCardsCategory[];
  // category slug → its bookable services (for the hover quick-menu list)
  quickServices?: Record<string, QuickService[]>;
  contactPhone?: string;
  contactWhatsApp?: string;
}

// Category-wise cards, each linking to its real category listing page —
// replaces the previous free-text admin-authored decorative cards (which
// had no click behavior at all). Always shows every active category,
// regardless of how many services exist in each, with an honest count.
export default function ServicesCards({ data, location = 'chennai', categoryCounts = {}, categories, quickServices = {}, contactPhone = '', contactWhatsApp = '' }: ServicesCardsProps) {
  const {
    headline = 'Clinical-Level Beauty Services',
    subheadline = 'Experience medical precision meets aesthetic artistry across our core specializations.',
    diagnosisPanel = {},
    categoryImages = {},
    quickMenu = {},
  } = data || {};

  const qm = quickMenu as QuickMenuConfig;
  const menuOn = qm.enabled !== false;
  const showServices = qm.showServices !== false;
  const minSvc = Math.max(0, Math.min(10, Number(qm.minServices ?? 2)));
  const maxSvc = Math.max(minSvc, Math.min(10, Number(qm.maxServices ?? 4)));
  const detailsOn = qm.details?.enabled !== false;
  const bookOn = qm.book?.enabled !== false;
  const contactCfg = qm.contact || {};
  const contactType = contactCfg.type || 'call';
  const contactHref =
    contactType === 'link' ? (contactCfg.href || '') :
    contactType === 'whatsapp' ? (contactWhatsApp ? `https://wa.me/${toWhatsAppNumber(contactWhatsApp)}` : '') :
    (contactPhone ? `tel:${contactPhone.replace(/\s/g, '')}` : '');
  const contactOn = contactCfg.enabled !== false && !!contactHref;

  return (
    <section id="services" className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 gap-5 md:gap-6">
          <div className="max-w-2xl">
            <h2 className="heading-section mb-3">
              {headline}
            </h2>
            <p className="text-text-secondary text-base md:text-lg leading-relaxed">
              {subheadline}
            </p>
          </div>
          <Link
            href={`/${location}/services`}
            className="min-h-11 text-secondary font-semibold flex items-center gap-2 hover:gap-3 transition-all shrink-0 whitespace-nowrap"
          >
            Explore All Services →
          </Link>
        </div>

        {/* CATEGORY CARDS — the whole card is a stretched link to the
            category page; the hover quick-menu (services + Details / Book /
            Contact) sits above it as real links, so nothing is a link
            nested inside a link. Hover-capable devices get the slide-up
            panel; touch devices get the compact action row instead. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {categories.map((cat) => {
            const count = categoryCounts[cat.slug] ?? 0;
            const image = categoryImages[cat.slug];
            const accent = cat.accentColor || '#3b82f6';
            const catHref = `/${location}/services/${cat.slug}`;
            const list = (quickServices[cat.slug] || []).slice(0, maxSvc);
            const showList = menuOn && showServices && list.length >= Math.max(1, minSvc);
            const anyAction = menuOn && (detailsOn || bookOn || contactOn);
            return (
              <div
                key={cat.slug}
                className="group relative overflow-hidden rounded-2xl min-h-[220px] md:min-h-[320px]"
              >
                <ImageWithFallback
                  src={image?.url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  fallback={<div className={`absolute inset-0 bg-gradient-to-br ${cat.heroGrad}`} />}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${image?.url ? 'from-black/75 via-black/30' : 'from-black/55 via-black/10'} to-transparent`} />
                <Link href={catHref} aria-label={`${cat.label} — explore treatments`} className="absolute inset-0 z-0" />

                {/* Label block (always visible) */}
                <div className={`absolute inset-x-0 bottom-0 p-4 md:p-6 ${anyAction ? '[@media(hover:none)]:pb-14' : ''} pointer-events-none transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-0`}>
                                    <h3 className="text-lg md:text-xl font-headline font-medium text-white mb-1 leading-tight">{cat.label}</h3>
                  <p className="text-white/70 text-xs md:text-sm mb-2">
                    {count > 0 ? `${count} treatment${count !== 1 ? 's' : ''}` : 'Ask our team'}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-white text-xs md:text-sm font-bold">
                    Explore <ArrowRight size={13} />
                  </span>
                </div>

                {/* Touch devices: compact always-visible actions */}
                {anyAction && (
                  <div className="absolute inset-x-0 bottom-0 z-10 flex gap-1.5 p-2 bg-gradient-to-t from-black/70 to-transparent pt-8 [@media(hover:hover)]:hidden">
                    {detailsOn && <MenuBtn href={catHref} icon={<FileText size={14} />} label={qm.details?.label || 'Details'} />}
                    {bookOn && <MenuBtn href={qm.book?.href || '/book'} icon={<CalendarCheck size={14} />} label={qm.book?.label || 'Book'} primary />}
                  </div>
                )}

                {/* Hover-capable devices: slide-up quick menu */}
                {anyAction && (
                  <div className="absolute inset-0 z-10 hidden flex-col justify-end bg-gradient-to-t from-primary via-primary/90 to-primary/40 p-4 md:p-5 opacity-0 translate-y-3 transition-all duration-300 pointer-events-none [@media(hover:hover)]:flex group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto">
                    <h3 className="text-lg font-headline font-medium text-white leading-tight mb-2">{cat.label}</h3>
                    {showList && (
                      <ul className="mb-3 space-y-1.5">
                        {list.map((sv) => (
                          <li key={sv.slug}>
                            <Link
                              href={`/${location}/services/${cat.slug}/${sv.slug}`}
                              className="flex items-center justify-between gap-2 text-[13px] text-white/85 hover:text-champagne transition-colors"
                            >
                              <span className="truncate">{sv.name}</span>
                              <ArrowRight size={12} className="shrink-0" />
                            </Link>
                          </li>
                        ))}
                        {count > list.length && (
                          <li>
                            <Link href={catHref} className="text-[12px] font-semibold text-champagne hover:underline">
                              View all {count} →
                            </Link>
                          </li>
                        )}
                      </ul>
                    )}
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${[detailsOn, bookOn, contactOn].filter(Boolean).length}, minmax(0, 1fr))` }}>
                      {detailsOn && <MenuBtn href={catHref} icon={<FileText size={15} />} label={qm.details?.label || 'View Details'} stacked />}
                      {bookOn && <MenuBtn href={qm.book?.href || '/book'} icon={<CalendarCheck size={15} />} label={qm.book?.label || 'Book Appointment'} primary stacked />}
                      {contactOn && (
                        <MenuBtn
                          href={contactHref}
                          icon={contactType === 'whatsapp' ? <MessageCircle size={15} /> : <Phone size={15} />}
                          label={contactCfg.label || (contactType === 'whatsapp' ? 'WhatsApp' : 'Contact')}
                          stacked
                          external={contactType === 'whatsapp'}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CONSULT CARD */}
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h3 className="font-headline text-xl font-medium text-primary md:text-2xl">
              {diagnosisPanel?.title || 'Not sure which treatment you need?'}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-secondary md:text-base">
              {diagnosisPanel?.description || 'Our doctors will assess your concern and talk you through suitable options.'}
            </p>
          </div>
          <Link href={diagnosisPanel?.ctaHref || '/book'} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover">
            {diagnosisPanel?.ctaText || 'Book a Consultation'}
          </Link>
        </div>

      </div>
    </section>
  );
}

// One quick-menu action. Same look for both layouts: `stacked` (icon over
// label — the hover panel's 3-up grid) vs inline (the touch row).
function MenuBtn({ href, icon, label, primary, stacked, external }: { href: string; icon: React.ReactNode; label: string; primary?: boolean; stacked?: boolean; external?: boolean }) {
  const cls = `${stacked ? 'flex-col py-2.5 text-[11px]' : 'flex-1 py-2 text-xs'} min-h-11 inline-flex items-center justify-center gap-1 rounded-xl font-bold leading-tight text-center transition-all ${
    primary ? 'bg-champagne text-primary hover:brightness-105' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur'
  }`;
  return external || href.startsWith('http') || href.startsWith('tel:') ? (
    <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{icon}<span>{label}</span></a>
  ) : (
    <Link href={href} className={cls}>{icon}<span>{label}</span></Link>
  );
}
