'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, CalendarCheck, CheckCircle, ShieldCheck, Loader } from 'lucide-react';
import { isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';

interface HeroData {
  badge?: string;
  headline?: string;
  headlineAccent?: string;
  subheadline?: string; // backwards-compat
  description?: string;
  features?: string[];
  ctaPrimary?: { text: string; href: string };
  phone?: string;
  whatsapp?: string;
  backgroundImage?: string;
  overlayColor?: string;
  patientCount?: string;
  rating?: string;
  yearsExperience?: string;
  showInlineForm?: boolean;
  concern_options?: string[];
  formHeadline?: string;
  formUrgencyText?: string;
  successMessage?: string;
  showTeamAvatars?: boolean;
  // Previously hardcoded strings in the hero's inline form — now
  // admin-editable (Settings -> Landing Pages -> Hero section), each
  // defaulting to exactly the text it replaces so an unedited LP looks
  // identical to before this existed.
  submitButtonText?: string;
  callNowText?: string;
  yearsExperienceLabel?: string;
  namePlaceholder?: string;
  phonePlaceholder?: string;
  emailPlaceholder?: string;
  concernPlaceholder?: string;
  successSubtext?: string;
  trustedByLabel?: string;
}

const DEFAULT_FEATURES = ['FDA Approved', '100% Natural', 'No Surgery No Scars', 'Minimal Downtime'];
const DEFAULT_CONCERNS = ['Hair Fall', 'Thinning Hair', 'Receding Hairline', 'Post Hair Transplant', 'Other'];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

export default function HeroSection({ data, slug, consultationFree }: { data: HeroData; slug: string; consultationFree: boolean }) {
  const {
    badge = 'Advanced Hair Restoration',
    headline = 'Regrow Stronger, Healthier Hair with',
    headlineAccent = 'PRP Treatment',
    description = data.subheadline ||
      'Clinically proven, non-surgical hair restoration performed by expert doctors. Natural results with zero downtime.',
    features = DEFAULT_FEATURES,
    ctaPrimary,
    phone,
    backgroundImage,
    overlayColor = '#0B2560',
    patientCount = '25,000+',
    rating = '4.9',
    yearsExperience = '20+',
    showInlineForm = true,
    concern_options = DEFAULT_CONCERNS,
    formHeadline = consultationFree ? 'Book Your Free Consultation' : 'Book Your Consultation',
    formUrgencyText = 'Limited slots this week!',
    successMessage = "✓ We'll call you within 2 hours!",
    showTeamAvatars = false,
    submitButtonText = consultationFree ? 'Book Free Consultation' : 'Book Consultation',
    callNowText = 'Call Now',
    yearsExperienceLabel = 'Years of Excellence',
    namePlaceholder = 'Full Name *',
    phonePlaceholder = 'Mobile Number *',
    emailPlaceholder = 'Email Address',
    concernPlaceholder = 'Select Your Concern',
    successSubtext = 'Our team will reach out shortly to confirm your slot.',
    trustedByLabel = 'Patients',
  } = data;

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  // ── inline form state ──
  const [form, setForm] = useState({ name: '', phone: '', email: '', concern: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidIndianMobile(form.phone)) { setError(INVALID_MOBILE_MESSAGE); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/lp/${slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          fields: form,
          variant: 'A',
        }),
      });
      const json = await res.json();
      if (json.success) setSuccess(true);
      else setError(json.message || 'Something went wrong. Please try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden" style={bgStyle}>
      {/* Overlay / gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: backgroundImage
            ? `linear-gradient(100deg, ${overlayColor}f2 0%, ${overlayColor}cc 45%, ${overlayColor}80 100%)`
            : 'linear-gradient(135deg, #0B2560 0%, #1a3a7a 55%, #3B82C4 100%)',
        }}
      />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#F5A623]/[0.08] translate-y-1/3 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 pt-24 pb-16 md:pt-28 md:pb-20">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-10 lg:gap-12 items-center">
          {/* ── Left column ── */}
          <div>
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="inline-flex items-center gap-2 bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5 backdrop-blur-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#F5A623] inline-block" />
              {badge}
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-white leading-[1.1]"
            >
              {headline}{' '}
              <span className="text-[#F5A623]">{headlineAccent}</span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-5 text-base md:text-lg text-white/80 leading-relaxed max-w-xl"
            >
              {description}
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="flex flex-wrap gap-x-5 gap-y-3 mt-6"
            >
              {features.map((f) => (
                <span key={f} className="flex items-center gap-1.5 text-sm font-semibold text-white/90">
                  <CheckCircle size={15} className="text-[#F5A623] shrink-0" />
                  {f}
                </span>
              ))}
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="flex flex-col sm:flex-row gap-3 mt-8"
            >
              {ctaPrimary?.href ? (
                <Link href={ctaPrimary.href}>
                  <button className="flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-8 py-4 rounded-2xl text-base shadow-2xl shadow-[#F5A623]/30 hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                    <CalendarCheck size={18} />
                    {ctaPrimary.text || submitButtonText}
                  </button>
                </Link>
              ) : (
                <button
                  onClick={() => document.getElementById('lp-hero-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-8 py-4 rounded-2xl text-base shadow-2xl shadow-[#F5A623]/30 hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                >
                  <CalendarCheck size={18} />
                  {ctaPrimary?.text || submitButtonText}
                </button>
              )}
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, '')}`}>
                  <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-7 py-4 rounded-2xl text-base backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                    <Phone size={17} />
                    {callNowText}
                  </button>
                </a>
              )}
            </motion.div>

            {/* Social proof row */}
            <motion.div
              custom={5}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="flex items-center gap-3 mt-8"
            >
              {showTeamAvatars && (
                <div className="flex -space-x-2.5">
                  {['#3B82C4', '#F5A623', '#0B2560', '#1a3a7a'].map((c, i) => (
                    <span
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white/80 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: c }}
                    >
                      {['A', 'R', 'S', 'K'][i]}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-white/85 font-semibold">
                {patientCount} Happy Patients
                <span className="text-white/40 mx-1.5">·</span>
                <span className="text-[#F5A623]">{rating} ★</span> Google Rating
              </p>
            </motion.div>
          </div>

          {/* ── Right column: form card ── */}
          {showInlineForm && (
            <motion.div
              id="lp-hero-form"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
              className="relative"
            >
              {/* years badge overlay — sized/offset so its footprint
                  (bottom-right edge at -24px + 80px = 56px into the card)
                  lands within the card's own top padding below, never over
                  the headline text. Verified via real geometry, not just
                  eyeballing: a smaller offset here was overlapping the
                  headline on every screen width the badge shows at, not
                  just narrow ones. */}
              <div className="absolute -top-6 -left-6 z-20 hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[#0B2560] border-4 border-[#F5A623] shadow-xl text-center">
                <span className="text-[#F5A623] font-extrabold text-base leading-none">{yearsExperience}</span>
                <span className="text-white text-[7px] font-bold uppercase tracking-wider mt-1 leading-tight px-1">
                  {yearsExperienceLabel}
                </span>
              </div>

              <div className="bg-white rounded-3xl shadow-2xl px-6 pb-6 pt-6 sm:pt-16 md:px-7 md:pb-7 md:pt-16">
                {success ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={34} className="text-green-500" />
                    </div>
                    <p className="text-lg font-extrabold text-[#0B2560]">{successMessage}</p>
                    <p className="text-sm text-gray-500 mt-2">{successSubtext}</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl md:text-2xl font-extrabold text-[#0B2560] leading-tight">
                      {formHeadline}
                    </h3>
                    {formUrgencyText && (
                      <div className="inline-flex items-center gap-1.5 mt-2.5 bg-[#F5A623]/15 text-[#c47f10] text-xs font-bold px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 bg-[#F5A623] rounded-full animate-pulse" />
                        {formUrgencyText}
                      </div>
                    )}

                    {error && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mt-4">
                        {error}
                      </div>
                    )}

                    <form onSubmit={submit} className="space-y-3 mt-5">
                      <input
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder={namePlaceholder}
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
                      />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        placeholder={phonePlaceholder}
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
                      />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        placeholder={emailPlaceholder}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
                      />
                      <select
                        value={form.concern}
                        onChange={(e) => set('concern', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
                      >
                        <option value="">{concernPlaceholder}</option>
                        {concern_options.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-6 py-3.5 rounded-2xl text-base shadow-xl shadow-[#F5A623]/25 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <>
                            <Loader size={18} className="animate-spin" /> Submitting…
                          </>
                        ) : (
                          <>
                            <CalendarCheck size={18} /> {submitButtonText}
                          </>
                        )}
                      </button>
                    </form>

                    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500 mt-4">
                      <ShieldCheck size={13} className="text-[#3B82C4]" />
                      Trusted by {patientCount} {trustedByLabel}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
