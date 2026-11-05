'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ChevronRight, ChevronLeft, MapPin, Sparkles, Leaf, Zap, Stethoscope } from 'lucide-react';
import { locations } from '@/app/data/locations';
import { trackBookingConversion } from '@/app/lib/trackConversion';
import { postInterestEvent, resolveInterestCategory } from '@/app/lib/personalization';
import { isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';
import { useIdempotencyKey } from '@/app/lib/useIdempotencyKey';
import { goToBookingSuccess } from '@/app/lib/bookingSuccessRedirect';
import { slotsForDate } from '@/app/lib/bookingSlots';

const SERVICES = [
  { id: 'Skin', icon: Sparkles, label: 'Skin & Aesthetics', desc: 'Acne, pigmentation, anti-ageing' },
  { id: 'Hair', icon: Leaf, label: 'Hair Restoration', desc: 'PRP, GFC, hair transplant' },
  { id: 'Laser', icon: Zap, label: 'Laser Treatments', desc: 'Laser hair reduction, rejuvenation' },
  { id: 'Other', icon: Stethoscope, label: 'Something Else', desc: 'Not sure? A doctor can advise' },
];

const LOCATIONS = [
  { id: 'Chennai', key: 'chennai', label: 'Chennai' },
  { id: 'Bangalore', key: 'bangalore', label: 'Bangalore' },
  { id: 'Kochi', key: 'kochi', label: 'Kochi' },
  { id: 'Coimbatore', key: 'coimbatore', label: 'Coimbatore' },
];

const STEP_TITLES: Record<number, string> = {
  1: 'What can we help with?',
  2: 'When would you like to come in?',
  3: 'Your contact details',
};
const BOOKING_STEPS = 3;

const inputCls = 'w-full min-h-12 px-4 py-3 border border-line-strong rounded-xl text-base text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition placeholder:text-gray-500 bg-white';
const labelCls = 'mb-1.5 block text-sm font-medium text-primary';
const optionCls = (selected: boolean) =>
  `flex min-h-16 w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selected ? 'border-primary bg-sand' : 'border-line bg-white hover:border-line-strong'}`;

export default function ConsultationForm({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formTopRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const getIdempotencyKey = useIdempotencyKey();

  // Scroll to the top of the form card (not window top — that would jump
  // past the page's own hero banner above it) whenever the step changes.
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', concern: '',
    service: '', location: '', date: '', time: '',
  });
  // Hidden from people; only form-filling bots complete it. See /api/booking.
  const [website, setWebsite] = useState('');

  const [promoCode, setPromoCode] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoStatus, setPromoStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');

  // A visitor arriving from a journey or assessment result has already given
  // these details, so they're prefilled. sessionId stays out of the booking shape.
  const journeySessionId = useRef('');
  const bookingEventFired = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service') || '';
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

    // Lets reception see the booking followed an assessment, without ever
    // implying a treatment was recommended.
    const assessmentConcernText = concernLabel
      ? `${concernLabel}${assessmentTypeParam ? ` (${assessmentTypeParam.charAt(0).toUpperCase()}${assessmentTypeParam.slice(1)} Assessment` : ''}${overallConcern ? ` · ${overallConcern}% ${severity}` : ''}${assessmentTypeParam ? ')' : ''}`
      : '';
    const matchedService = SERVICES.find((s) => s.id.toLowerCase() === service.toLowerCase())?.id || '';

    if (service || assessmentConcernText || matchedLocation || name || phone) {
      setForm((f) => ({
        ...f,
        concern: assessmentConcernText || (service ? service : f.concern),
        service: matchedService || f.service,
        location: matchedLocation || f.location,
        name: name ? name : f.name,
        phone: phone ? phone : f.phone,
      }));
    }

    const bookingCategory =
      resolveInterestCategory(assessmentTypeParam) ||
      resolveInterestCategory(service) ||
      resolveInterestCategory(concernLabel) ||
      resolveInterestCategory(overallConcern);
    if (bookingCategory && !bookingEventFired.current) {
      bookingEventFired.current = true;
      postInterestEvent('booking_started', bookingCategory);
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

  const branchKey = LOCATIONS.find((l) => l.id === form.location)?.key || '';
  const branchHours = branchKey ? locations[branchKey]?.hours ?? [] : [];
  const slots = form.date ? slotsForDate(form.date, branchHours) : [];

  const validate = (s: number) => {
    if (s === 1) {
      if (!form.service) return setError('Please choose what you need help with'), false;
      if (!form.location) return setError('Please choose a clinic'), false;
    }
    if (s === 2) {
      if (!form.date) return setError('Please choose a preferred date'), false;
      if (!form.time) return setError('Please choose a preferred time'), false;
    }
    if (s === 3) {
      if (form.name.trim().length < 2) return setError('Please enter your name'), false;
      if (!isValidIndianMobile(form.phone)) return setError(INVALID_MOBILE_MESSAGE), false;
    }
    return true;
  };

  const next = () => validate(step) && setStep(step + 1);
  const prev = () => { setError(''); setStep(step - 1); };

  const submit = async () => {
    if (loading || !validate(1) || !validate(2) || !validate(3)) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Duplicate-submission protection — a retry after a timeout reuses
          // the SAME key, so the backend won't create a second booking.
          'Idempotency-Key': getIdempotencyKey({
            name: form.name, phone: form.phone, service: form.service,
            location: form.location, date: form.date, time: form.time,
          }),
        },
        body: JSON.stringify({
          ...form,
          website,
          ...(promoStatus === 'valid' ? { promoCode: promoCode.trim().toUpperCase(), promoDiscount } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        trackBookingConversion({
          bookingId: data.bookingId,
          service: form.service,
          location: form.location,
          source: data.source,
          medium: data.medium,
          campaign: data.campaign,
          sourceAccount: data.sourceAccount,
          alreadyProcessed: data.alreadyProcessed,
        });
        // Close the loop on a booking that came from a journey session.
        // Fire-and-forget: must never delay or fail the booking itself.
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
        // Fixed, static success URL for ad-platform triggers. The booking id
        // travels by cookie: see app/lib/bookingSuccessRedirect.ts.
        goToBookingSuccess(router, data.bookingId, form.location);
        return;
      }
      setError(data.message || 'We could not send your request. Please try again, or call the clinic.');
    } catch {
      setError('We could not send your request. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Tomorrow in the clinic's time zone. toISOString() alone is UTC, which gave
  // the wrong day between midnight and 05:30 IST.
  const minDateStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  return (
    <div ref={formTopRef}>
      <div className="h-1 bg-line">
        <div className="h-1 bg-primary transition-all duration-300" style={{ width: `${(step / BOOKING_STEPS) * 100}%` }} />
      </div>

      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); if (step < BOOKING_STEPS) next(); else submit(); }}
        className="p-5 md:p-10 space-y-6"
      >
        <div>
          <p className="eyebrow">Step {step} of {BOOKING_STEPS}</p>
          <h2 className="mt-1 font-headline text-2xl font-extrabold text-primary">{STEP_TITLES[step]}</h2>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <fieldset>
              <legend className={labelCls}>Treatment area</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SERVICES.map(({ id, icon: Icon, label, desc }) => (
                  <button key={id} type="button" aria-pressed={form.service === id} onClick={() => set('service', id)} className={optionCls(form.service === id)}>
                    <Icon size={20} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold text-primary">{label}</span>
                      <span className="mt-0.5 block text-sm text-text-secondary">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={labelCls}>Clinic</legend>
              <div className="grid grid-cols-2 gap-3">
                {LOCATIONS.map((l) => (
                  <button key={l.id} type="button" aria-pressed={form.location === l.id} onClick={() => { setError(''); setForm((f) => ({ ...f, location: l.id, time: '' })); }} className={optionCls(form.location === l.id)}>
                    <MapPin size={18} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
                    <span className="text-sm font-semibold text-primary">{l.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="book-date" className={labelCls}>Preferred date</label>
              <input id="book-date" type="date" min={minDateStr} value={form.date}
                onChange={(e) => { setError(''); setForm((f) => ({ ...f, date: e.target.value, time: '' })); }}
                className={inputCls} />
            </div>
            {form.date && (
              slots.length > 0 ? (
                <fieldset>
                  <legend className={labelCls}>Preferred time</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((t) => (
                      <button key={t} type="button" aria-pressed={form.time === t} onClick={() => set('time', t)}
                        className={`min-h-11 rounded-xl border px-2 text-sm font-medium transition-colors ${form.time === t ? 'border-primary bg-primary text-white' : 'border-line bg-white text-primary hover:border-line-strong'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p role="status" className="rounded-xl bg-sand p-4 text-sm text-text-secondary">This clinic is closed on that day. Please choose another date.</p>
              )
            )}
            <p className="text-sm text-text-secondary">This is a preferred time. Our team will contact you to confirm your appointment.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="book-name" className={labelCls}>Full name</label>
              <input id="book-name" name="name" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="book-phone" className={labelCls}>Mobile number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-text-secondary" aria-hidden="true">+91</span>
                <input id="book-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={`${inputCls} pl-14`} maxLength={10} />
              </div>
            </div>
            <div>
              <label htmlFor="book-email" className={labelCls}>Email <span className="font-normal text-text-secondary">(optional)</span></label>
              <input id="book-email" name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="book-concern" className={labelCls}>Anything the doctor should know? <span className="font-normal text-text-secondary">(optional)</span></label>
              <textarea id="book-concern" name="concern" value={form.concern} onChange={(e) => set('concern', e.target.value)} className={`${inputCls} h-24 resize-none`} />
            </div>

            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="book-website">Leave this field empty</label>
              <input id="book-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div>
              <button type="button" onClick={() => setPromoOpen((o) => !o)} aria-expanded={promoOpen} className="min-h-11 text-sm font-medium text-secondary underline underline-offset-2">
                Have a promo code?
              </button>
              {promoOpen && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <label htmlFor="book-promo" className="sr-only">Promo code</label>
                    <input id="book-promo" type="text" value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus('idle'); }}
                      className={`${inputCls} flex-1 font-mono`} />
                    <button type="button" onClick={applyPromo} disabled={promoStatus === 'checking' || !promoCode.trim()}
                      className="min-h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">
                      {promoStatus === 'checking' ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {promoStatus === 'valid' && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{promoMessage}</p>}
                  {promoStatus === 'invalid' && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{promoMessage}</p>}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-sand p-4 text-sm">
              <p className="mb-2 font-semibold text-primary">Your request</p>
              <p className="text-text-secondary">
                {SERVICES.find((s) => s.id === form.service)?.label} at {form.location}, {form.date} at {form.time}
                {promoStatus === 'valid' ? ` (${promoCode}, ${promoDiscount}% off)` : ''}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-text-secondary">
              By sending this request you agree that DR Youth Clinic may contact you by phone or WhatsApp about your appointment, as described in our{' '}
              <Link href="/privacy-policy" className="font-medium text-primary underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </div>
        )}

        <div className={`flex gap-3 pt-2 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <button type="button" onClick={prev} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line-strong px-5 text-sm font-semibold text-primary">
              <ChevronLeft size={16} aria-hidden="true" /> Back
            </button>
          )}
          <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            {step < BOOKING_STEPS ? 'Continue' : loading ? 'Sending…' : 'Request Appointment'}
            {!loading && <ChevronRight size={16} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
