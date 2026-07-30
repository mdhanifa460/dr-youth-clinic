import Image from 'next/image';
import Link from 'next/link';
import { FaLinkedinIn } from 'react-icons/fa';

// Extracted verbatim from homepage/DoctorsSection.tsx so it can be placed as
// its own Section Registry entry (zone: sidebar/main widget) instead of only
// existing inline inside the multi-doctor grid.
export default function DoctorCard({ doc }: { doc: any }) {
  const role = doc.title || doc.role;
  const experience = typeof doc.experience === 'number'
    ? (doc.experience > 0 ? `${doc.experience}+ Years Exp.` : '')
    : (doc.experience || '');

  const inner = (
    <>
      <div className="relative aspect-[4/3] sm:aspect-[5/4] md:aspect-[4/5] bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] overflow-hidden">
        {doc.photo?.url ? (
          <Image
            src={doc.photo.url}
            alt={doc.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-top transition duration-500 md:hover:scale-105"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-6xl">👨‍⚕️</div>
        )}
      </div>
      <div className="p-4 md:p-5">
        <h3 className="font-bold text-[#0B2560] text-base md:text-sm leading-snug">{doc.name}</h3>
        <p className="text-gray-500 text-sm md:text-xs mt-1">{role}</p>
      </div>
    </>
  );

  return (
    <div className="bg-[#f6faff] rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#e8eff7] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,37,96,0.1)]">
      {doc._id ? (
        <Link href={`/doctors/${doc._id}`} className="block">{inner}</Link>
      ) : inner}
      <div className="px-4 pb-4 md:px-5 md:pb-5 flex items-center justify-between -mt-1">
        <span className="text-xs text-[#3B82C4] font-semibold">{experience}</span>
        {doc.linkedIn && doc.linkedIn !== '#' && (
          <a
            href={doc.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-[#0B2560] flex items-center justify-center text-white hover:bg-[#0d2d73] hover:-translate-y-0.5 transition-all duration-300"
          >
            <FaLinkedinIn size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
