'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle, Calendar, MapPin, Phone, User as UserIcon, Stethoscope,
  Video, Building2, CalendarPlus, Navigation, MessageCircle, PhoneCall,
  LayoutDashboard, RotateCcw, Sparkles, Upload, Star, Tag, ChevronDown,
  Loader,
} from 'lucide-react';
import { useBranchWhatsApp, toWaLink } from '@/app/lib/useBranchWhatsApp';

// ── Types (mirroring the server page's plain-JSON props) ──
interface Doctor { name?: string; title?: string; photo?: { url?: string } }
interface BookingData {
  bookingId: string;
  name: string;
  phone: string;
  service: string;
  location: string;
  date: string;
  time: string;
  consultationMode?: 'in_clinic' | 'video' | 'phone';
  doctorId?: Doctor | null;
  preVisitReports?: { url: string; name: string }[];
}
interface CtaButtonConfig { key: string; label: string; enabled: boolean }
interface RelatedSectionConfig { key: string; label: string; enabled: boolean; order: number }
interface ChecklistItemConfig { key: string; label: string; enabled: boolean }
interface BookingSuccessConfigData {
  thankYouHeadline: string;
  thankYouMessage: string;
  preVisitInstructions: string[];
  ctaButtons: CtaButtonConfig[];
  relatedSections: RelatedSectionConfig[];
  checklistEnabled: boolean;
  checklistItems: ChecklistItemConfig[];
}
interface BranchInfo { name: string; address: string; phone: string; map: string }

const CONSULTATION_LABEL: Record<string, { label: string; icon: typeof Building2 }> = {
  in_clinic: { label: 'In-Clinic Visit', icon: Building2 },
  video: { label: 'Video Consultation', icon: Video },
  phone: { label: 'Phone Consultation', icon: Phone },
};

function logEvent(bookingId: string, eventType: string, location?: string) {
  fetch('/api/booking-success-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, eventType, location: location || '' }),
  }).catch(() => {});
}

// Builds a downloadable .ics file client-side — no external calendar API
// needed. "10:00 AM" style time strings (this codebase's TIME_SLOTS
// format) parse into a real Date; falls back to a 10am slot if the date/
// time couldn't be parsed (e.g. an LP-sourced booking with no slot yet).
function buildIcsDataUri(booking: BookingData, branchName: string): string {
  const parseTime = (t: string): { h: number; m: number } => {
    const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return { h: 10, m: 0 };
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const isPM = match[3].toUpperCase() === 'PM';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return { h, m };
  };
  let start: Date;
  const { h, m } = parseTime(booking.time);
  if (/^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    const [y, mo, d] = booking.date.split('-').map(Number);
    start = new Date(y, mo - 1, d, h, m);
  } else {
    start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(h, m, 0, 0);
  }
  const end = new Date(start.getTime() + 45 * 60000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DR Youth Clinic//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.bookingId}@dryouthclinic`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${(booking.service || 'Consultation').replace(/,/g, '')} — DR Youth Clinic`,
    `DESCRIPTION:Booking ID: ${booking.bookingId}. Consultation at DR Youth Clinic ${branchName}.`,
    `LOCATION:${branchName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

function useChecklist(bookingId: string, itemKeys: string[]) {
  const storageKey = `booking-success-checklist-${bookingId}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
  }, [storageKey]);
  const markDone = (key: string) => {
    setDone((prev) => {
      const next = { ...prev, [key]: true };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return { done, markDone };
}

export default function BookingSuccessClient({
  booking,
  config,
  branchInfo,
  siteConfig,
  related,
}: {
  booking: BookingData;
  config: BookingSuccessConfigData;
  branchInfo: BranchInfo | null;
  siteConfig: { publicWhatsApp?: string; publicPhone?: string };
  related: {
    beforeAfter: any[];
    successStories: any[];
    faqs: { question: string; answer: string }[];
    offers: any[];
  };
}) {
  const branchKey = String(booking.location || '').toLowerCase();
  const branchWhatsApp = useBranchWhatsApp(siteConfig.publicWhatsApp || '', branchKey);
  const waHref = toWaLink(branchWhatsApp);
  const branchPhone = branchInfo?.phone || siteConfig.publicPhone || '';
  const { done: checklistDone, markDone } = useChecklist(booking.bookingId, config.checklistItems?.map((c) => c.key) || []);

  const pageViewLogged = useRef(false);
  useEffect(() => {
    if (pageViewLogged.current) return;
    pageViewLogged.current = true;
    logEvent(booking.bookingId, 'page_view', branchKey);
  }, [booking.bookingId, branchKey]);

  const ctaEnabled = (key: string) => config.ctaButtons?.find((c) => c.key === key)?.enabled !== false;
  const ctaLabel = (key: string, fallback: string) => config.ctaButtons?.find((c) => c.key === key)?.label || fallback;

  const consultInfo = CONSULTATION_LABEL[booking.consultationMode || 'in_clinic'];
  const doctor = booking.doctorId && typeof booking.doctorId === 'object' ? booking.doctorId : null;

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReportUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bookingId', booking.bookingId);
      const res = await fetch('/api/booking-report-upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        markDone('uploadReports');
        logEvent(booking.bookingId, 'checklist_upload_reports_click', branchKey);
      } else {
        setUploadError(data.message || 'Upload failed');
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const addToCalendar = () => {
    logEvent(booking.bookingId, 'cta_click_calendar', branchKey);
    markDone('calendar');
    const link = document.createElement('a');
    link.href = buildIcsDataUri(booking, branchInfo?.name || booking.location);
    link.download = `dr-youth-clinic-${booking.bookingId}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDirections = () => {
    logEvent(booking.bookingId, 'cta_click_directions', branchKey);
    markDone('directions');
    const dest = branchInfo?.address || booking.location;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank', 'noopener,noreferrer');
  };

  const startAiAssessment = () => {
    logEvent(booking.bookingId, 'checklist_ai_assessment_click', branchKey);
    markDone('aiAssessment');
  };

  const CTA_DEFS: Record<string, { icon: typeof CalendarPlus; render: () => React.ReactNode }> = {
    calendar: {
      icon: CalendarPlus,
      render: () => (
        <button key="calendar" onClick={addToCalendar} className={ctaClass('primary')}>
          <CalendarPlus size={16} /> {ctaLabel('calendar', 'Add to Calendar')}
        </button>
      ),
    },
    directions: {
      icon: Navigation,
      render: () => (
        <button key="directions" onClick={getDirections} className={ctaClass('secondary')}>
          <Navigation size={16} /> {ctaLabel('directions', 'Get Directions')}
        </button>
      ),
    },
    whatsapp: {
      icon: MessageCircle,
      render: () =>
        waHref ? (
          <a
            key="whatsapp"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logEvent(booking.bookingId, 'cta_click_whatsapp', branchKey)}
            className={ctaClass('whatsapp')}
          >
            <MessageCircle size={16} /> {ctaLabel('whatsapp', 'WhatsApp Clinic')}
          </a>
        ) : null,
    },
    call: {
      icon: PhoneCall,
      render: () =>
        branchPhone ? (
          <a
            key="call"
            href={`tel:${branchPhone.replace(/\s/g, '')}`}
            onClick={() => logEvent(booking.bookingId, 'cta_click_call', branchKey)}
            className={ctaClass('secondary')}
          >
            <PhoneCall size={16} /> {ctaLabel('call', 'Call Clinic')}
          </a>
        ) : null,
    },
    portal: {
      icon: LayoutDashboard,
      render: () => (
        <Link
          key="portal"
          href="/my-appointments"
          onClick={() => logEvent(booking.bookingId, 'cta_click_portal', branchKey)}
          className={ctaClass('secondary')}
        >
          <LayoutDashboard size={16} /> {ctaLabel('portal', 'View Patient Portal')}
        </Link>
      ),
    },
    bookAnother: {
      icon: RotateCcw,
      render: () => (
        <Link
          key="bookAnother"
          href="/book"
          onClick={() => logEvent(booking.bookingId, 'cta_click_bookAnother', branchKey)}
          className={ctaClass('secondary')}
        >
          <RotateCcw size={16} /> {ctaLabel('bookAnother', 'Book Another Appointment')}
        </Link>
      ),
    },
  };

  const enabledCtaKeys = (config.ctaButtons || []).filter((c) => c.enabled).map((c) => c.key);
  const enabledChecklist = (config.checklistItems || []).filter((c) => c.enabled);
  const enabledRelated = [...(config.relatedSections || [])].filter((s) => s.enabled).sort((a, b) => a.order - b.order);

  const thankYouHeadline = (config.thankYouHeadline || 'Thank you, {name}!').replace('{name}', booking.name.split(' ')[0] || booking.name);

  return (
    <main className="min-h-screen bg-[#f6faff] py-10 md:py-14">
      <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-8">
        {/* ── Hero ── */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={44} className="text-green-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560] mb-2">{thankYouHeadline}</h1>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">{config.thankYouMessage}</p>
        </div>

        {/* ── Booking details ── */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <h2 className="text-sm font-bold text-[#0B2560] uppercase tracking-widest mb-4">Your Appointment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={Tag} label="Booking ID" value={booking.bookingId} mono />
            <DetailRow icon={Calendar} label="Date & Time" value={`${booking.date} · ${booking.time}`} />
            {doctor?.name && <DetailRow icon={Stethoscope} label="Doctor" value={`${doctor.name}${doctor.title ? ` — ${doctor.title}` : ''}`} />}
            <DetailRow icon={MapPin} label="Branch" value={branchInfo?.name || booking.location} />
            {consultInfo && <DetailRow icon={consultInfo.icon} label="Consultation Type" value={consultInfo.label} />}
            {branchPhone && <DetailRow icon={Phone} label="Contact Number" value={branchPhone} />}
          </div>
        </div>

        {/* ── CTA buttons ── */}
        {enabledCtaKeys.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {enabledCtaKeys.map((key) => CTA_DEFS[key]?.render())}
          </div>
        )}

        {/* ── Prepare for Your Consultation checklist ── */}
        {config.checklistEnabled && enabledChecklist.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
            <p className="text-xs font-bold text-[#F5A623] uppercase tracking-widest mb-1">📝 Next Steps</p>
            <h2 className="text-lg font-headline font-bold text-[#0B2560] mb-4">Prepare for Your Consultation</h2>
            <ul className="space-y-2.5">
              <ChecklistRow done label="Appointment Booked" />
              {enabledChecklist.map((item) => {
                if (item.key === 'aiAssessment') {
                  return (
                    <li key={item.key}>
                      <Link
                        href={`/plan-my-journey${branchKey ? `?clinic=${branchKey}` : ''}`}
                        onClick={startAiAssessment}
                        className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#0B2560] transition group"
                      >
                        <ChecklistBox done={!!checklistDone.aiAssessment} />
                        <span className={checklistDone.aiAssessment ? 'line-through text-gray-400' : 'group-hover:underline'}>{item.label}</span>
                      </Link>
                    </li>
                  );
                }
                if (item.key === 'uploadReports') {
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#0B2560] transition group disabled:opacity-60"
                      >
                        {uploading ? <Loader size={16} className="animate-spin text-gray-400" /> : <ChecklistBox done={!!checklistDone.uploadReports} />}
                        <span className={checklistDone.uploadReports ? 'line-through text-gray-400' : 'group-hover:underline'}>
                          {item.label}{booking.preVisitReports?.length ? ` (${booking.preVisitReports.length} uploaded)` : ''}
                        </span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReportUpload(f); e.target.value = ''; }}
                      />
                      {uploadError && <p className="text-xs text-red-500 mt-1 ml-6">{uploadError}</p>}
                    </li>
                  );
                }
                if (item.key === 'calendar') {
                  return (
                    <li key={item.key}>
                      <button onClick={addToCalendar} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#0B2560] transition group">
                        <ChecklistBox done={!!checklistDone.calendar} />
                        <span className={checklistDone.calendar ? 'line-through text-gray-400' : 'group-hover:underline'}>{item.label}</span>
                      </button>
                    </li>
                  );
                }
                if (item.key === 'directions') {
                  return (
                    <li key={item.key}>
                      <button onClick={getDirections} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#0B2560] transition group">
                        <ChecklistBox done={!!checklistDone.directions} />
                        <span className={checklistDone.directions ? 'line-through text-gray-400' : 'group-hover:underline'}>{item.label}</span>
                      </button>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        )}

        {/* ── Pre-visit instructions ── */}
        {config.preVisitInstructions?.length > 0 && (
          <div className="bg-[#f6faff] border border-[#0B2560]/10 rounded-3xl p-6 md:p-8">
            <h2 className="text-sm font-bold text-[#0B2560] uppercase tracking-widest mb-3">Before You Arrive</h2>
            <ul className="space-y-2">
              {config.preVisitInstructions.map((instr, i) => (
                <li key={i} className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
                  <span className="text-[#F5A623] mt-1 shrink-0">•</span> {instr}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Related content ── */}
        {enabledRelated.map((section) => {
          if (section.key === 'beforeAfter' && related.beforeAfter.length > 0) {
            return (
              <RelatedSection key="beforeAfter" title={section.label} icon={Sparkles}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {related.beforeAfter.slice(0, 4).map((r: any) => (
                    <Link key={r._id} href="/results" className="block rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition">
                      <div className="relative aspect-square bg-gray-100">
                        {r.after?.url && <Image src={r.after.url} alt={r.title} fill className="object-cover" sizes="150px" />}
                      </div>
                      <p className="text-[11px] font-semibold text-[#0B2560] px-2 py-1.5 truncate">{r.title}</p>
                    </Link>
                  ))}
                </div>
              </RelatedSection>
            );
          }
          if (section.key === 'aiAssessment') {
            return (
              <RelatedSection key="aiAssessment" title={section.label} icon={Sparkles}>
                <Link
                  href={`/plan-my-journey${branchKey ? `?clinic=${branchKey}` : ''}`}
                  onClick={startAiAssessment}
                  className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#0B2560] to-[#1a3a7a] text-white rounded-2xl p-5 hover:-translate-y-0.5 transition"
                >
                  <div>
                    <p className="font-bold text-sm">Not sure what to expect? Take our 2-minute AI Assessment</p>
                    <p className="text-white/60 text-xs mt-1">Helps your doctor prepare a personalised plan before you arrive</p>
                  </div>
                  <Sparkles size={22} className="text-[#F5A623] shrink-0" />
                </Link>
              </RelatedSection>
            );
          }
          if (section.key === 'successStories' && related.successStories.length > 0) {
            return (
              <RelatedSection key="successStories" title={section.label} icon={Star}>
                <div className="space-y-3">
                  {related.successStories.slice(0, 3).map((r: any) => (
                    <div key={r._id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-1 mb-1.5">
                        {Array.from({ length: r.rating || 5 }).map((_, i) => <Star key={i} size={12} fill="#F5A623" className="text-[#F5A623]" />)}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{r.reviewText}</p>
                      <p className="text-xs font-semibold text-[#0B2560] mt-1.5">{r.authorName}</p>
                    </div>
                  ))}
                </div>
              </RelatedSection>
            );
          }
          if (section.key === 'faqs' && related.faqs.length > 0) {
            return (
              <RelatedSection key="faqs" title={section.label} icon={ChevronDown}>
                <FaqList items={related.faqs} />
              </RelatedSection>
            );
          }
          if (section.key === 'offers' && related.offers.length > 0) {
            return (
              <RelatedSection key="offers" title={section.label} icon={Tag}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {related.offers.slice(0, 3).map((o: any) => (
                    <Link key={o._id} href="/offers" className="block border border-gray-100 rounded-xl p-4 hover:shadow-md transition">
                      <p className="font-bold text-sm text-[#0B2560] mb-1">{o.title}</p>
                      <p className="text-xs text-gray-500">₹{o.discountedPrice} <span className="line-through text-gray-300">₹{o.originalPrice}</span></p>
                    </Link>
                  ))}
                </div>
              </RelatedSection>
            );
          }
          return null;
        })}
      </div>
    </main>
  );
}

function ctaClass(variant: 'primary' | 'secondary' | 'whatsapp'): string {
  const base = 'flex-1 min-w-[160px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200';
  if (variant === 'primary') return `${base} bg-[#0B2560] text-white hover:bg-[#0d2d72] hover:-translate-y-0.5 shadow-sm`;
  if (variant === 'whatsapp') return `${base} bg-[#25D366]/10 text-[#128C4A] border border-[#25D366]/30 hover:bg-[#25D366]/20`;
  return `${base} bg-white text-[#0B2560] border border-gray-200 hover:bg-gray-50`;
}

function DetailRow({ icon: Icon, label, value, mono }: { icon: typeof Calendar; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#f6faff] flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[#0B2560]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
        <p className={`text-sm font-bold text-gray-800 ${mono ? 'font-mono' : ''} truncate`}>{value}</p>
      </div>
    </div>
  );
}

function ChecklistBox({ done }: { done: boolean }) {
  return (
    <span
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
        done ? 'bg-green-500 border-green-500' : 'border-gray-300'
      }`}
    >
      {done && <CheckCircle size={13} className="text-white" strokeWidth={3} />}
    </span>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-gray-500">
      <ChecklistBox done={done} />
      <span className={done ? 'line-through' : ''}>{label}</span>
    </li>
  );
}

function RelatedSection({ title, icon: Icon, children }: { title: string; icon: typeof Sparkles; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
      <h2 className="text-sm font-bold text-[#0B2560] uppercase tracking-widest mb-4 flex items-center gap-2">
        <Icon size={14} className="text-[#F5A623]" /> {title}
      </h2>
      {children}
    </div>
  );
}

function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[#0B2560]"
          >
            {f.question}
            <ChevronDown size={15} className={`shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && <p className="px-4 pb-3 text-sm text-gray-500 leading-relaxed">{f.answer}</p>}
        </div>
      ))}
    </div>
  );
}
