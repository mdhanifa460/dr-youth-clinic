import Image from 'next/image';
import Link from 'next/link';
import { FaLinkedinIn } from 'react-icons/fa';

export default function DoctorsSection({ data }: { data: any }) {
  const {
    headline = 'Meet Our Expert Doctors',
    subheadline = 'Experienced professionals dedicated to delivering natural, safe & long-lasting results.',
    viewAllText = 'View all',
    viewAllHref = '#',
    doctors = [],
  } = data || {};

  if (doctors.length === 0) return null;

  return (
    <section id="expertise" className="py-12 md:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] leading-tight">
              {headline}
            </h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-lg">{subheadline}</p>
          </div>
          <Link href={viewAllHref} className="min-h-11 text-[#3B82C4] font-semibold text-sm whitespace-nowrap hover:text-[#0B2560] transition hidden md:flex items-center">
            {viewAllText} →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
          {doctors.map((doc: any, i: number) => {
            const role = doc.title || doc.role;
            const experience = typeof doc.experience === 'number'
              ? (doc.experience > 0 ? `${doc.experience}+ Years Exp.` : '')
              : doc.experience;
            const photo = (
              <div className="relative aspect-[4/3] sm:aspect-[5/4] md:aspect-[4/5] bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] overflow-hidden">
                {doc.photo?.url ? (
                  <Image src={doc.photo.url} alt={doc.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover object-top transition duration-500 md:hover:scale-105" />
                ) : (
                  <div className="h-full flex items-center justify-center text-6xl">👨‍⚕️</div>
                )}
              </div>
            );
            const info = (
              <div className="p-4 md:p-5">
                <h3 className="font-bold text-[#0B2560] text-base md:text-sm leading-snug">{doc.name}</h3>
                <p className="text-gray-500 text-sm md:text-xs mt-1">{role}</p>
              </div>
            );
            return (
              <div key={doc._id ?? i} className="bg-[#f6faff] rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#e8eff7] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,37,96,0.1)]">
                {doc._id ? (
                  <Link href={`/doctors/${doc._id}`} className="block">
                    {photo}
                    {info}
                  </Link>
                ) : (
                  <>{photo}{info}</>
                )}
                <div className="px-4 pb-4 md:px-5 md:pb-5 flex items-center justify-between -mt-1">
                  <span className="text-xs text-[#3B82C4] font-semibold">{experience}</span>
                  {doc.linkedIn && doc.linkedIn !== '#' && (
                    <a href={doc.linkedIn} target="_blank" rel="noopener noreferrer"
                      className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-[#0B2560] flex items-center justify-center text-white hover:bg-[#0d2d73] hover:-translate-y-0.5 transition-all duration-300">
                      <FaLinkedinIn size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
