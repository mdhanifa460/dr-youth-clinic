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

  return (
    <section id="expertise" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560]">
              {headline}
            </h2>
            <p className="text-gray-500 mt-2 text-sm max-w-lg">{subheadline}</p>
          </div>
          <Link href={viewAllHref} className="text-[#3B82C4] font-semibold text-sm whitespace-nowrap hover:text-[#0B2560] transition hidden md:block">
            {viewAllText} →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {doctors.map((doc: any, i: number) => (
            <div key={i} className="bg-[#f6faff] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="relative h-52 bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]">
                {doc.photo?.url ? (
                  <Image src={doc.photo.url} alt={doc.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover object-top" />
                ) : (
                  <div className="h-full flex items-center justify-center text-6xl">👨‍⚕️</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#0B2560] text-sm">{doc.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{doc.role}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-[#3B82C4] font-semibold">{doc.experience}</span>
                  {doc.linkedIn && doc.linkedIn !== '#' && (
                    <a href={doc.linkedIn} target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full bg-[#0B2560] flex items-center justify-center text-white hover:bg-[#0d2d73] transition">
                      <FaLinkedinIn size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
