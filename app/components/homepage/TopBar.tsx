import { FaFacebookF, FaInstagram, FaYoutube, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { MdPhone, MdEmail } from 'react-icons/md';
import { AiFillStar } from 'react-icons/ai';

const ICON_MAP: Record<string, React.ReactNode> = {
  facebook: <FaFacebookF size={14} />,
  instagram: <FaInstagram size={14} />,
  youtube: <FaYoutube size={14} />,
  twitter: <FaTwitter size={14} />,
  whatsapp: <FaWhatsapp size={14} />,
};

export default function TopBar({ data }: { data: any }) {
  const { phone, email, badge, socialLinks = [] } = data || {};

  return (
    <div className="bg-[#0B2560] text-white text-xs py-2 px-4 md:px-10">
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

        {socialLinks.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-white/60">Follow Us:</span>
            {socialLinks.map((s: any, i: number) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F5A623] transition"
              >
                {ICON_MAP[s.platform] ?? s.platform}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
