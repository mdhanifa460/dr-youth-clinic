import Link from 'next/link';

interface ExpertsData { headline?: string; subheading?: string }

export default function ExpertsSection({ data, doctors }: { data: ExpertsData; doctors: any[] }) {
  const { headline = 'Meet the Doctors', subheading } = data;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Our Team</p>
          <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>
          {subheading && <p className="text-gray-500 mt-3 text-sm max-w-lg mx-auto">{subheading}</p>}
        </div>

        {doctors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🩺</p>
            <p className="text-gray-500 font-semibold">Our team profiles are coming soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc: any) => {
              const initials = doc.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
              return (
                <div
                  key={String(doc._id)}
                  className="bg-white rounded-3xl p-8 ring-1 ring-[#e8eff7] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
                >
                  {doc.photo?.url ? (
                    <img src={doc.photo.url} alt={doc.name} className="w-20 h-20 rounded-full object-cover mb-4 shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0B2560] to-[#3B82C4] flex items-center justify-center mb-4 shadow-lg">
                      <span className="text-white font-headline font-extrabold text-xl tracking-wider">{initials}</span>
                    </div>
                  )}
                  <h3 className="font-headline font-bold text-[#0B2560] text-base">{doc.name}</h3>
                  <p className="text-[#F5A623] text-xs font-bold uppercase tracking-wider mt-1">{doc.title}</p>
                  {doc.experience > 0 && (
                    <p className="text-gray-400 text-xs mt-1">{doc.experience} Years Experience</p>
                  )}
                  {doc.specializations?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                      <p className="text-gray-500 text-xs leading-relaxed">{doc.specializations.join(' · ')}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/doctors" className="inline-flex items-center gap-2 text-sm font-bold text-[#0B2560] hover:text-[#3B82C4] transition">
            View All Doctors →
          </Link>
        </div>
      </div>
    </section>
  );
}
