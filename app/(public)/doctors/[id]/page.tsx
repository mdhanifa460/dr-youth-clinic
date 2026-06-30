import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Award, ArrowLeft } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Doctor } from '@/app/models/Doctor';

const LOCATION_LABELS: Record<string, string> = {
  chennai: 'Chennai', bangalore: 'Bangalore', coimbatore: 'Coimbatore', kochi: 'Kochi', all: 'All Locations',
};

async function getDoctor(id: string) {
  try {
    await connectDB();
    const doc = await (Doctor as any).findById(id).lean();
    if (!doc || doc.active === false) return null;
    return JSON.parse(JSON.stringify(doc));
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const doctor = await getDoctor(params.id);
  if (!doctor) return { title: 'Doctor Not Found | DR Youth Clinic' };
  return {
    title: `${doctor.name} – ${doctor.title} | DR Youth Clinic`,
    description: doctor.bio || `Meet ${doctor.name}, ${doctor.title} at DR Youth Clinic.`,
  };
}

export default async function DoctorDetailPage({ params }: { params: { id: string } }) {
  const doctor = await getDoctor(params.id);
  if (!doctor) notFound();

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="bg-[#0B2560]">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
          <Link href="/#expertise" className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-semibold mb-6 transition">
            <ArrowLeft size={13} /> Back to Doctors
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden bg-white/10 shrink-0">
              {doctor.photo?.url ? (
                <Image src={doctor.photo.url} alt={doctor.name} fill sizes="144px" className="object-cover" />
              ) : (
                <div className="h-full flex items-center justify-center text-5xl">👨‍⚕️</div>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-white">{doctor.name}</h1>
              <p className="text-[#F5A623] font-semibold text-sm mt-1">{doctor.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {doctor.experience > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-white/10 text-white px-3 py-1 rounded-full">
                    <Award size={11} /> {doctor.experience}+ Years Experience
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs bg-white/10 text-white px-3 py-1 rounded-full capitalize">
                  <MapPin size={11} /> {
                    doctor.locations?.includes('all')
                      ? 'All Clinics'
                      : doctor.locations?.map((l: string) => LOCATION_LABELS[l] || l).join(', ') || ''
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-5xl mx-auto px-6 py-10 md:py-14 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-8">
          {doctor.bio && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">About</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{doctor.bio}</p>
            </div>
          )}
          {doctor.specializations?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {doctor.specializations.map((s: string, i: number) => (
                  <span key={i} className="text-sm bg-[#f6faff] border border-blue-50 text-[#0B2560] px-3 py-1.5 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA card */}
        <div className="bg-[#f6faff] border border-blue-50 rounded-3xl p-6 h-fit space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Book a Consultation</p>
          <p className="text-sm text-gray-500">Schedule a free initial consultation with {doctor.name?.split(' ')[0]}.</p>
          <Link href="/book" className="flex items-center justify-center gap-2 bg-[#0B2560] text-white py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition">
            <Calendar size={14} /> Book Consultation
          </Link>
        </div>
      </section>
    </main>
  );
}
