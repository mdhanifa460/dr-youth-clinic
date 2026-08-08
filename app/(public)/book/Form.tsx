'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight, ChevronLeft, Calendar, Clock } from 'lucide-react';
import { locations } from '@/app/data/locations';
import { trackBookingConversion } from '@/app/lib/trackConversion';

const SERVICES = [
  { id: 'Skin', icon: '✨', label: 'Skin & Aesthetics', desc: 'Acne, pigmentation, anti-ageing' },
  { id: 'Hair', icon: '🌿', label: 'Hair Restoration', desc: 'PRP, GFC, hair transplant' },
  { id: 'Laser', icon: '⚡', label: 'Laser Precision', desc: 'Laser hair removal, rejuvenation' },
  { id: 'Other', icon: '🏥', label: 'Specialist Care', desc: 'Other aesthetic concerns' },
];

const LOCATIONS = [
  { id: 'Chennai',    label: 'Chennai',    address: locations.chennai.address    },
  { id: 'Bangalore',  label: 'Bangalore',  address: locations.bangalore.address  },
  { id: 'Kochi',      label: 'Kochi',      address: locations.kochi.address      },
  { id: 'Coimbatore', label: 'Coimbatore', address: locations.coimbatore.address },
];

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
];

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition placeholder:text-gray-500 bg-[#f6faff]';

export default function ConsultationForm({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formTopRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Scroll to the top of the form card (not window top — that would jump
  // past the page's own hero banner above it) whenever the step changes,
  // so a taller previous step's scroll position doesn't leave the new,
  // often-shorter step rendering mid-content or off-screen. Skips the
  // very first render so landing on /book doesn't itself trigger a scroll.
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', concern: '',
    service: '', location: '', date: '', time: '',
  });

  const [promoCode, setPromoCode] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  // AI Beauty Journey Module 9 — a visitor arriving here from a "Book
  // Consultation" link on their journey results already told the journey
  // their name/phone (Lead Capture), preferred branch (Branch Selection),
  // and matched treatment. Prefill instead of asking again. Reads
  // window.location.search directly in an effect rather than
  // next/navigation's useSearchParams(), matching this codebase's existing
  // convention (see skin-quiz/page.tsx) to avoid that hook's Suspense
  // boundary requirement for a value only ever needed post-mount anyway.
  // sessionId isn't a form field — kept in a ref so it survives to the
  // submit handler without becoming part of the submitted booking shape.
  const journeySessionId = useRef('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service') || '';
    // Pre-Consultation Assessment handoff (Hair/Skin/Body redesign) — a
    // concern *label* (e.g. "Hair Fall Impact"), never a treatment name,
    // since none exists at this point in the journey. See
    // AssessmentResults.tsx's handleCta and the architecture review §11.
    const concernLabel = params.get('concern') || '';
    const assessmentTypeParam = params.get('assessmentType') || '';
    const overallConcern = params.get('overallConcern') || '';
    const severity = params.get('severity') || '';
    const locationKey = (params.get('location') || '').toLowerCase();
    const name = params.get('name') || '';
    const phone = params.get('phone') || '';
    journeySessionId.current = params.get('sessionId') || '';

    const matchedLocation = locations[locationKey]
      ? locationKey.charAt(0).toUpperCase() + locationKey.slice(1)
      : '';

    // Human-readable, editable prefill — lets reception/the doctor see at a
    // glance that this booking followed a completed assessment, without
    // ever implying a treatment was recommended.
    const assessmentConcernText = concernLabel
      ? `${concernLabel}${assessmentTypeParam ? ` (${assessmentTypeParam.charAt(0).toUpperCase()}${assessmentTypeParam.slice(1)} Assessment` : ''}${overallConcern ? ` · ${overallConcern}% ${severity}` : ''}${assessmentTypeParam ? ')' : ''}`
      : '';

    if (service || assessmentConcernText || matchedLocation || name || phone) {
      setForm((f) => ({
        ...f,
        concern: assessmentConcernText || (service ? service : f.concern),
        location: matchedLocation || f.location,
        name: name ? name : f.name,
        phone: phone ? phone : f.phone,
      }));
    }
  }, []);

  const set = (key: string, val: string) => { setForm(f => ({ ...f, [key]: val })); setError(''); };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoStatus('checking');
    try {
      const res = await fetch(`/api/promo?code=${encodeURIComponent(promoCode.trim())}`);
      const data = await res.json();
      if (data.valid) {
        setPromoStatus('valid');
        setPromoDiscount(data.discountPercent);
        setPromoMessage(data.message);
      } else {
        setPromoStatus('invalid');
        setPromoDiscount(0);
        setPromoMessage(data.message || 'Invalid promo code');
      }
    } catch {
      setPromoStatus('invalid');
      setPromoMessage('Could not validate code');
    }
  };

  const validate = (s: number) => {
    if (s === 1) {
      if (!form.name.trim()) return setError('Please enter your name'), false;
      if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit phone number'), false;
      if (!form.concern.trim()) return setError('Please describe your concern'), false;
    }
    if (s === 2 && !form.service) return setError('Please select a service'), false;
    if (s === 3 && !form.location) return setError('Please select a location'), false;
    if (s === 4) {
      if (!form.date) return setError('Please select a date'), false;
      if (!form.time) return setError('Please select a time slot'), false;
    }
    return true;
  };

  const next = () => validate(step) && setStep(step + 1);
  const prev = () => { setError(''); setStep(step - 1); };

  const submit = async () => {
    if (!validate(4)) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone,
          ...(promoStatus === 'valid' ? { promoCode: promoCode.trim().toUpperCase(), promoDiscount } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        trackBookingConversion({ bookingId: data.bookingId, service: form.service, location: form.location });
        // AI Beauty Journey Module 9 — close the loop: this booking
        // originated from a journey session (arrived via the prefilled
        // link above), so mark that session converted. Fire-and-forget,
        // same as every other non-blocking analytics call in this flow —
        // never let this delay or fail the booking confirmation itself.
        if (journeySessionId.current) {
          fetch('/api/patient-journey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: journeySessionId.current,
              appointmentBooked: true,
              currentModule: 'appointment_booked',
            }),
          }).catch(() => {});
        }
        // Configurable Booking Success page (app/admin/booking-success) —
        // replaces the old inline "thank you" div below with a dedicated,
        // shareable/bookmarkable route carrying real appointment details,
        // CTAs, and the pre-visit checklist.
        router.push(`/book/success/${data.bookingId}`);
        return;
      }
      else setError(data.message || 'Booking failed. Please try again.');
    } catch { setError('An error occurred. Please try again.'); }
    finally { setLoading(false); }
  };

  // Min date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div ref={formTopRef}>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-1.5 bg-[#0B2560] rounded-full transition-all duration-500"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <div className="p-6 md:p-10 space-y-6">
        {/* Step label */}
        <div>
          <p className="text-[10px] font-bold text-[#3B82C4] uppercase tracking-widest">Step {step} of 4</p>
          <h2 className="text-xl font-headline font-bold text-[#0B2560] mt-0.5">
            {step === 1 && 'Tell us about yourself'}
            {step === 2 && 'What are you looking for?'}
            {step === 3 && 'Choose your clinic'}
            {step === 4 && 'Pick a date & time'}
          </h2>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div className="space-y-4">
            <label htmlFor="book-name" className="sr-only">Full Name</label>
            <input id="book-name" name="name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Full Name *" className={inputCls} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label htmlFor="book-phone" className="sr-only">Phone Number</label>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">+91</span>
                <input id="book-phone" name="phone" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Phone Number *" className={`${inputCls} pl-12`} maxLength={10} />
              </div>
              <label htmlFor="book-email" className="sr-only">Email (optional)</label>
              <input id="book-email" name="email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="Email (optional)" className={inputCls} />
            </div>
            <label htmlFor="book-concern" className="sr-only">Describe your skin / hair concern</label>
            <textarea id="book-concern" name="concern" value={form.concern} onChange={e => set('concern', e.target.value)}
              placeholder="Describe your skin / hair concern *"
              className={`${inputCls} h-28 resize-none`} />
          </div>
        )}

        {/* ── STEP 2: Service ── */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICES.map((s) => (
              <button key={s.id} onClick={() => set('service', s.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  form.service === s.id
                    ? 'border-[#0B2560] bg-[#0B2560]/5 shadow-sm'
                    : 'border-gray-100 hover:border-[#3B82C4]/30 bg-white'
                }`}>
                <span className="text-3xl shrink-0">{s.icon}</span>
                <div>
                  <p className={`font-bold text-sm ${form.service === s.id ? 'text-[#0B2560]' : 'text-gray-800'}`}>{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 3: Location ── */}
        {step === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LOCATIONS.map((l) => (
              <button key={l.id} onClick={() => set('location', l.id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  form.location === l.id
                    ? 'border-[#0B2560] bg-[#0B2560]/5 shadow-sm'
                    : 'border-gray-100 hover:border-[#3B82C4]/30 bg-white'
                }`}>
                <span className="text-2xl shrink-0">📍</span>
                <div>
                  <p className={`font-bold text-sm ${form.location === l.id ? 'text-[#0B2560]' : 'text-gray-800'}`}>{l.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{l.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 4: Date & Time ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Calendar size={12} /> Select Date
              </label>
              <input type="date" min={minDateStr} value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Clock size={12} /> Select Time Slot
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button key={t} onClick={() => set('time', t)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                      form.time === t
                        ? 'bg-[#0B2560] text-white border-[#0B2560]'
                        : 'bg-white border-gray-100 text-gray-600 hover:border-[#0B2560] hover:text-[#0B2560]'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo code */}
            <div>
              <button
                type="button"
                onClick={() => setPromoOpen(o => !o)}
                className="text-xs text-[#3B82C4] font-semibold hover:text-[#0B2560] transition flex items-center gap-1"
              >
                {promoOpen ? '▲' : '▼'} Have a promo code?
              </button>
              {promoOpen && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus('idle'); }}
                      placeholder="Enter code"
                      className={`${inputCls} flex-1 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={promoStatus === 'checking' || !promoCode.trim()}
                      className="px-4 py-3 bg-[#0B2560] text-white rounded-2xl text-sm font-semibold disabled:opacity-50 transition hover:bg-[#0d2d72] whitespace-nowrap"
                    >
                      {promoStatus === 'checking' ? '…' : 'Apply'}
                    </button>
                  </div>
                  {promoStatus === 'valid' && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-xl">
                      ✓ {promoMessage}
                    </div>
                  )}
                  {promoStatus === 'invalid' && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-xl">
                      ✗ {promoMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            {form.date && form.time && (
              <div className="bg-[#f6faff] border border-blue-50 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Booking Summary</p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {[
                    ['Name', form.name],
                    ['Phone', `+91 ${form.phone}`],
                    ['Service', form.service],
                    ['Location', form.location],
                    ['Date', form.date],
                    ['Time', form.time],
                    ...(promoStatus === 'valid' ? [['Promo', `${promoCode} (${promoDiscount}% off)`]] : []),
                  ].map(([label, val]) => (
                    <div key={label}>
                      <span className="text-gray-500 text-xs">{label}</span>
                      <p className="font-semibold text-[#0B2560] text-xs">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav buttons */}
        <div className={`flex ${step > 1 ? 'justify-between' : 'justify-end'} pt-2`}>
          {step > 1 && (
            <button onClick={prev} className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition">
              <ChevronLeft size={15} /> Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={next} className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg shadow-[#0B2560]/20">
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={submit} disabled={loading}
              className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-7 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Booking...' : 'Confirm Booking'}
              {!loading && <ChevronRight size={15} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
