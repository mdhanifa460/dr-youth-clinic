import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight, Award, GraduationCap, Clock, MapPin, IndianRupee, Users } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Course } from '@/app/models/Course';
// Registers Doctor with Mongoose for the .populate('instructors') call below.
import '@/app/models/Doctor';
import CourseEnquiryForm from './CourseEnquiryForm';

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

interface PageProps {
  params: { slug: string };
}

async function getCourse(slug: string) {
  try {
    await connectDB();
    return await (Course as any)
      .findOne({ slug, status: 'published' })
      .populate('instructors', 'name photo title experience')
      .lean();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const course = await getCourse(params.slug);
  if (!course) return {};

  const title = course.metaTitle || course.title;
  const description = course.metaDescription || course.shortDescription;

  return {
    title,
    description,
    keywords: course.keywords?.length ? course.keywords : undefined,
    alternates: { canonical: course.canonicalUrl || `${SITE_URL}/academy/courses/${course.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/academy/courses/${course.slug}`,
      images: (course.ogImage?.url || course.thumbnail?.url) ? [{ url: course.ogImage?.url || course.thumbnail.url, width: 1200, height: 630 }] : [],
      type: 'website',
    },
  };
}

function getInitials(name?: string): string {
  return name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function formatDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const BATCH_STATUS_STYLES: Record<string, string> = {
  upcoming: 'bg-blue-50 text-blue-600',
  open: 'bg-green-50 text-green-600',
  closed: 'bg-gray-100 text-gray-500',
  completed: 'bg-gray-100 text-gray-500',
};

export default async function CourseDetailPage({ params }: PageProps) {
  const course = await getCourse(params.slug);
  if (!course) notFound();

  const instructors = (course.instructors || []) as any[];

  return (
    <main className="bg-[#f6faff] min-h-screen pb-24 lg:pb-16">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#0B2560] transition">Home</Link>
          <ChevronRight size={12} />
          <Link href="/academy#certification-programs" className="hover:text-[#0B2560] transition">Certification Programs</Link>
          <ChevronRight size={12} />
          <span className="text-[#0B2560] font-semibold line-clamp-1">{course.title}</span>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 grid lg:grid-cols-3 gap-8 lg:gap-10 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <span className="inline-block bg-[#F5A623]/15 text-[#B9790B] text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
              {course.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560] mt-3 leading-tight">
              {course.title}
            </h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{course.shortDescription}</p>
            <p className="text-gray-500 text-sm mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1"><Clock size={13} /> {course.durationLabel}</span>
              <span className="flex items-center gap-1"><MapPin size={13} /> {course.format}</span>
              <span className="capitalize">· {course.level}</span>
            </p>
          </div>

          {course.thumbnail?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnail.url} alt={course.title} className="w-full aspect-video object-cover rounded-2xl border border-gray-100" />
          )}

          {course.description && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-headline font-extrabold text-[#0B2560] text-lg mb-3">About This Program</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{course.description}</p>
            </div>
          )}

          {course.curriculum?.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-headline font-extrabold text-[#0B2560] text-lg">Curriculum</h2>
              {course.curriculum.map((mod: any, i: number) => (
                <details key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 group" {...(i === 0 ? { open: true } : {})}>
                  <summary className="cursor-pointer font-semibold text-[#0B2560] text-sm list-none flex items-center justify-between">
                    <span>{i + 1}. {mod.title}{mod.duration ? ` · ${mod.duration}` : ''}</span>
                    <span className="text-[#0B2560] text-lg font-light transition-transform group-open:rotate-45">+</span>
                  </summary>
                  {mod.topics?.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {mod.topics.map((t: string, j: number) => (
                        <li key={j} className="text-gray-600 text-sm flex items-start gap-2">
                          <span className="text-[#F5A623] mt-1">•</span> {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              ))}
            </div>
          )}

          {instructors.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-headline font-extrabold text-[#0B2560] text-lg">Instructors</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {instructors.map((doc) => (
                  <div key={String(doc._id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-[#0B2560] to-[#3B82C4]">
                      {doc.photo?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.photo.url} alt={doc.name} className="absolute inset-0 w-full h-full object-cover object-top" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white font-headline font-extrabold text-sm tracking-wider">
                          {getInitials(doc.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-[#0B2560] text-sm leading-snug truncate">{doc.name}</h3>
                      {doc.title && <p className="text-[#3B82C4] text-xs font-medium truncate">{doc.title}</p>}
                      {doc.experience > 0 && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                          <Award size={10} className="text-[#F5A623] shrink-0" />
                          {doc.experience}+ Years Experience
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {course.eligibility?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-headline font-extrabold text-[#0B2560] text-lg mb-3">Eligibility</h2>
              <ul className="space-y-1.5">
                {course.eligibility.map((e: string, i: number) => (
                  <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                    <span className="text-[#F5A623] mt-1">•</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.batches?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <h2 className="font-headline font-extrabold text-[#0B2560] text-lg p-5 pb-3">Upcoming Batches</h2>
              <div className="divide-y divide-gray-50">
                {course.batches.map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">{b.label}</p>
                      {(b.startDate || b.endDate) && (
                        <p className="text-gray-500 text-xs mt-0.5">{formatDate(b.startDate)}{b.endDate ? ` – ${formatDate(b.endDate)}` : ''}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase shrink-0 ${BATCH_STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-500'}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#0B2560]">
              <GraduationCap size={18} />
              <p className="font-headline font-extrabold text-base">{course.certificationName}</p>
            </div>
            {course.fee?.amount > 0 && (
              <div className="flex items-center gap-2 text-gray-700">
                <IndianRupee size={15} className="text-[#F5A623]" />
                <p className="font-bold text-lg">
                  {course.fee.discountedAmount ? course.fee.discountedAmount.toLocaleString('en-IN') : course.fee.amount.toLocaleString('en-IN')}
                  {course.fee.discountedAmount && (
                    <span className="text-gray-500 text-sm font-normal line-through ml-2">{course.fee.amount.toLocaleString('en-IN')}</span>
                  )}
                </p>
                {course.fee.installmentsAvailable && <span className="text-xs text-gray-500">(installments available)</span>}
              </div>
            )}
            {course.highlights?.length > 0 && (
              <ul className="space-y-1.5 pt-2 border-t border-gray-50">
                {course.highlights.map((h: string, i: number) => (
                  <li key={i} className="text-gray-600 text-xs flex items-start gap-1.5">
                    <Users size={11} className="text-[#3B82C4] mt-0.5 shrink-0" /> {h}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <CourseEnquiryForm courseId={String(course._id)} courseTitle={course.title} />
        </aside>
      </div>
    </main>
  );
}
