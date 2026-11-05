import Link from 'next/link';
import { FaLinkedinIn } from 'react-icons/fa';
import FocalImage from '@/app/components/media/FocalImage';

// Extracted verbatim from homepage/DoctorsSection.tsx so it can be placed as
// its own Section Registry entry (zone: sidebar/main widget) instead of only
// existing inline inside the multi-doctor grid.
export default function DoctorCard({ doc }: { doc: any }) {
  const role = doc.qualifications?.trim() || doc.title || doc.role;
  const experience = typeof doc.experience === 'number'
    ? (doc.experience > 0 ? `${doc.experience}+ Years Exp.` : '')
    : (doc.experience || '');

  const inner = (
    <>
      {/* Fixed 4:5 ratio (not the old responsive 4:3/5:4/4:5 mix, which
          silently changed crop across breakpoints) with focal-point-aware
          cropping — defaults to face-safe center when a doctor has no
          focal point set yet. */}
      <FocalImage
        image={doc.photo}
        aspectRatio="4/5"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        alt={doc.name}
        className="bg-gradient-to-br from-line to-[#c5d9ef]"
        imgClassName="transition duration-500 md:hover:scale-105"
              />
      <div className="p-4 md:p-5">
        <h3 className="font-semibold text-primary text-sm md:text-base leading-snug">{doc.name}</h3>
        <p className="text-text-secondary text-xs md:text-sm mt-1 leading-snug">{role}</p>
      </div>
    </>
  );

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-line transition-colors duration-200 hover:border-line-strong">
      {doc._id ? (
        <Link href={`/doctors/${doc._id}`} className="block">{inner}</Link>
      ) : inner}
      <div className="px-4 pb-4 md:px-5 md:pb-5 flex items-center justify-between -mt-1">
        <span className="text-xs text-text-secondary">{experience}</span>
        {doc.linkedIn && doc.linkedIn !== '#' && (
          <a
            href={doc.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${doc.name} on LinkedIn`}
            className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover hover:-translate-y-0.5 transition-all duration-300"
          >
            <FaLinkedinIn size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
