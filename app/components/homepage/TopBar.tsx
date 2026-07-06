import { FaFacebookF, FaInstagram, FaYoutube, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { MdPhone, MdEmail } from 'react-icons/md';
import { AiFillStar } from 'react-icons/ai';
import type { SiteConfig } from '@/app/lib/siteConfig';

const ICON_MAP: Record<string, React.ReactNode> = {
  facebook: <FaFacebookF size={14} />,
  instagram: <FaInstagram size={14} />,
  youtube: <FaYoutube size={14} />,
  twitter: <FaTwitter size={14} />,
  whatsapp: <FaWhatsapp size={14} />,
};

const PLATFORM_COLOR: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  facebook: '#1877F2',
  youtube: '#FF0000',
};

const MOBILE_SOCIAL: Array<{
  platform: string;
  icon: React.ReactNode;
  color: string;
  fallback?: string;
}> = [
  {
    platform: 'whatsapp',
    icon: <FaWhatsapp size={15} />,
    color: '#25D366',
    fallback: process.env.CLINIC_PHONE ? `https://wa.me/${process.env.CLINIC_PHONE}` : undefined,
  },
  { platform: 'instagram', icon: <FaInstagram size={15} />, color: '#E1306C' },
  { platform: 'facebook',  icon: <FaFacebookF size={14} />, color: '#1877F2' },
  { platform: 'youtube',   icon: <FaYoutube size={15} />,   color: '#FF0000' },
];

export default function TopBar({ data, siteConfig }: { data: any; siteConfig?: SiteConfig }) {
  const { phone, email, badge, socialLinks = [] } = data || {};

  const BRAND_FALLBACK: Record<string, string> = {
    instagram: siteConfig?.instagramUrl || '',
    facebook:  siteConfig?.facebookUrl  || '',
    youtube:   siteConfig?.youtubeUrl   || '',
  };

  // Merge brand URLs as fallback when homepage editor link is '#' or empty
  const resolvedSocialLinks: { platform: string; url: string }[] = socialLinks.map((s: any) => ({
    ...s,
    url: (!s.url || s.url === '#') ? (BRAND_FALLBACK[s.platform] || '') : s.url,
  })).filter((s: any) => s.url);

  const mobileSocials = MOBILE_SOCIAL.map((item) => ({
    ...item,
    url: resolvedSocialLinks.find((s) => s.platform === item.platform)?.url || item.fallback,
  })).filter((item) => item.url);

  return (
    <>
      {/* ── MOBILE: Call + social icon buttons ── */}
      {phone && (
        <div className="md:hidden flex items-stretch bg-[#0B2560] text-white text-[11px] font-semibold">

          {/* Left: tap-to-call (takes most of the width) */}
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 hover:bg-white/10 active:bg-white/20 transition"
          >
            <MdPhone size={14} className="shrink-0" />
            <span>{phone}</span>
          </a>

          {/* Divider */}
          {mobileSocials.length > 0 && (
            <span className="w-px bg-white/20 self-stretch" />
          )}

          {/* Right: social icon buttons */}
          {mobileSocials.map((item) => (
            <a
              key={item.platform}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.platform}
              style={{ color: item.color }}
              className="flex w-11 items-center justify-center hover:bg-white/10 active:bg-white/20 transition"
            >
              {item.icon}
            </a>
          ))}
        </div>
      )}

      {/* ── DESKTOP: full info bar (unchanged) ── */}
      <div className="hidden md:block bg-[#0B2560] text-white text-xs py-2 px-4 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-[#F5A623] transition">
                <MdPhone size={13} />
                <span>{phone}</span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-[#F5A623] transition">
                <MdEmail size={13} />
                <span>{email}</span>
              </a>
            )}
            {badge && (
              <span className="flex items-center gap-1 text-[#F5A623] font-semibold">
                <AiFillStar size={12} />
                {badge}
              </span>
            )}
          </div>

          {resolvedSocialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-white/60">Follow Us:</span>
              {resolvedSocialLinks.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={PLATFORM_COLOR[s.platform] ? { color: PLATFORM_COLOR[s.platform] } : undefined}
                  className={PLATFORM_COLOR[s.platform] ? 'transition opacity-90 hover:opacity-100' : 'hover:text-[#F5A623] transition'}
                >
                  {ICON_MAP[s.platform] ?? s.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
