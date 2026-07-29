import Link from 'next/link';
import { Award, Clock, MapPin } from 'lucide-react';
import CoursesComingSoon from './components/CoursesComingSoon';

export default function CertificationProgramsSection({ courses, siteConfig }: { courses: any[]; siteConfig: any }) {
  const waMessage = encodeURIComponent('Hi, I would like to know more about the aesthetic certification programs at DR Youth Clinic.');
  const contactUrl = siteConfig.publicWhatsApp
    ? `https://wa.me/${siteConfig.publicWhatsApp.replace(/\D/g, '')}?text=${waMessage}`
    : '';

  return (
    <section id="certification-programs" className="bg-white border-t border-b border-gray-100 py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {courses.length === 0 ? (
          <CoursesComingSoon contactUrl={contactUrl} />
        ) : (
          <>
            <div className="mb-8 text-center">
              <span className="inline-flex items-center gap-1.5 bg-[#0B2560] text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-3">
                For Practitioners &amp; Doctors
              </span>
              <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">Certification Programs</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">
                Hands-on aesthetic certification courses for practicing doctors and clinicians — taught by our own specialists.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c: any) => (
                <Link
                  key={String(c._id)}
                  href={`/academy/courses/${c.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {c.thumbnail?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumbnail.url} alt={c.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] to-[#3B82C4]" />
                    )}
                    <span className="absolute top-3 left-3 bg-[#F5A623]/95 text-[#0B2560] text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full">
                      {c.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-headline font-bold text-[#0B2560] text-sm leading-snug line-clamp-2 mb-2">{c.title}</h3>
                    <p className="text-gray-500 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1"><Clock size={11} /> {c.durationLabel}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {c.format}</span>
                    </p>
                    {c.instructors?.length > 0 && (
                      <p className="text-gray-500 text-[11px] mt-2 flex items-center gap-1">
                        <Award size={11} className="text-[#F5A623]" /> {c.instructors.map((i: any) => i.name).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
