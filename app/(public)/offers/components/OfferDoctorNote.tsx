import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

// Real doctor photos/names only — deliberately NO fabricated first-person
// quotes attributed to named doctors. One generic, honest sentence instead.
export default function OfferDoctorNote({ doctors }: { doctors: any[] }) {
  if (doctors.length === 0) return null;

  return (
    <section className="bg-white py-14">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-2">Doctor Reviewed</p>
        <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560] mb-3">
          Every Offer, Reviewed by Our Specialists
        </h2>
        <p className="text-gray-500 text-sm max-w-lg mx-auto mb-10">
          Every offer on this page is reviewed by our specialists to make sure it&apos;s right for your treatment plan.
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {doctors.map((doc) => (
            <div key={doc._id} className="flex flex-col items-center w-28">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#f6faff] border-2 border-[#F5A623]/40 mb-2">
                {doc.photo?.url ? (
                  <Image src={doc.photo.url} alt={doc.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="flex items-center justify-center h-full text-xl">👨‍⚕️</span>
                )}
              </div>
              <p className="text-xs font-bold text-[#0B2560] text-center leading-tight">{doc.name}</p>
              <p className="text-[10px] text-gray-400 text-center leading-tight mt-0.5">{doc.title}</p>
            </div>
          ))}
        </div>

        <Link href="/doctors" className="inline-flex items-center gap-2 text-[#3B82C4] font-semibold text-sm hover:text-[#0B2560] transition">
          Meet Our Doctors <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
