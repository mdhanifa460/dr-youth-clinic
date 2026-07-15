import { ShieldCheck, BookOpen } from 'lucide-react';

interface ReviewingDoctor {
  name: string;
  title?: string;
  qualifications?: string;
  experience?: number;
  photo?: { url: string };
}

interface MedicalReference {
  label: string;
  url: string;
}

export default function TrustSection({
  doctor,
  references,
  author,
  authorTitle,
}: {
  doctor?: ReviewingDoctor | null;
  references?: MedicalReference[];
  author: string;
  authorTitle: string;
}) {
  return (
    <div className="mt-12 p-6 bg-[#f6faff] rounded-3xl border border-blue-50 space-y-5">
      {doctor ? (
        <div className="flex items-start gap-4">
          {doctor.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.photo.url} alt={doctor.name} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#0B2560] flex items-center justify-center text-white font-extrabold text-lg shrink-0">
              {doctor.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#3B82C4]" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#3B82C4]">Reviewed By</p>
            </div>
            <p className="font-bold text-[#0B2560] mt-1">{doctor.name}</p>
            {doctor.title && <p className="text-xs text-gray-500 mt-0.5">{doctor.title}</p>}
            {(doctor.qualifications || doctor.experience) && (
              <p className="text-xs text-gray-500 mt-1">
                {doctor.qualifications}
                {doctor.qualifications && doctor.experience ? ' · ' : ''}
                {doctor.experience ? `${doctor.experience}+ years experience` : ''}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0B2560] flex items-center justify-center text-white font-extrabold text-lg shrink-0">
            {author?.split(' ').map((w) => w[0]).slice(0, 2).join('') || 'DR'}
          </div>
          <div>
            <p className="font-bold text-[#0B2560]">{author}</p>
            <p className="text-xs text-[#3B82C4] mt-0.5">{authorTitle}</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Medically reviewed content from the DR Youth Clinic specialist team — committed to accurate, evidence-based skin and hair care information.
            </p>
          </div>
        </div>
      )}

      {references && references.length > 0 && (
        <div className="pt-4 border-t border-blue-100/60">
          <div className="flex items-center gap-1.5 mb-2.5">
            <BookOpen size={13} className="text-gray-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sources & References</p>
          </div>
          <ul className="space-y-1">
            {references.map((ref, i) => (
              <li key={i} className="text-xs">
                <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-[#3B82C4] hover:underline">
                  {ref.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
