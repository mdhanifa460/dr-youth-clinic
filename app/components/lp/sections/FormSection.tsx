'use client';

import { useState } from 'react';
import { Loader, CheckCircle, Phone, Star } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface FormSectionData {
  headline?: string;
  subtext?: string;
  urgencyPoints?: string[];
  slotsLeft?: number;
  phone?: string;
}

interface FormSectionProps {
  data: FormSectionData;
  fields: FormField[];
  submitText?: string;
  successMessage?: string;
  slug: string;
  variant?: 'A' | 'B';
}

const DEFAULT_URGENCY = [
  'Expert certified dermatologists only',
  'Results visible from first session',
  'Zero-cost EMI · flexible payment plans',
];

export default function FormSection({
  data,
  fields,
  submitText = 'Book Free Consultation',
  successMessage = "Thank you! We'll call you within 2 hours.",
  slug,
  variant = 'A',
}: FormSectionProps) {
  const {
    headline = 'Book Your Free Consultation',
    subtext = "Fill in your details and we'll call you within 2 hours.",
    urgencyPoints = DEFAULT_URGENCY,
    slotsLeft,
    phone,
  } = data;

  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/lp/${slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form['name'] || form['full-name'] || '',
          phone: form['phone'] || form['mobile'] || form['tel'] || '',
          email: form['email'] || '',
          fields: form,
          variant,
        }),
      });

      const data = await res.json();
      if (data.success) setSuccess(true);
      else setError(data.message || 'Something went wrong. Please try again.');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayFields: FormField[] = fields.length
    ? fields
    : [
        { id: 'name',  label: 'Full Name',      type: 'text',  placeholder: 'Your name',             required: true  },
        { id: 'phone', label: 'Mobile Number',   type: 'tel',   placeholder: '10-digit mobile number', required: true  },
        { id: 'email', label: 'Email Address',   type: 'email', placeholder: 'your@email.com',         required: false },
      ];

  return (
    <section id="lp-form" className="bg-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.1fr]">

        {/* ── Left: urgency panel ── */}
        <div className="relative bg-gradient-to-br from-[#0B2560] via-[#0f2e6e] to-[#1a3a7a] px-8 py-14 md:py-20 flex flex-col justify-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#F5A623]/10 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#F5A623] bg-[#F5A623]/15 px-3 py-1.5 rounded-full mb-5">
              Free Consultation
            </span>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              {headline}
            </h2>
            <p className="text-white/65 mt-4 text-sm md:text-base leading-relaxed">{subtext}</p>

            <ul className="mt-7 space-y-3.5">
              {(urgencyPoints.length ? urgencyPoints : DEFAULT_URGENCY).map((pt, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/90">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#F5A623]/20 border border-[#F5A623]/50 flex items-center justify-center shrink-0">
                    <CheckCircle size={11} className="text-[#F5A623]" />
                  </span>
                  {pt}
                </li>
              ))}
            </ul>

            {/* Rating card */}
            <div className="mt-8 flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl px-4 py-3.5 backdrop-blur-sm">
              <div className="flex gap-0.5 text-[#F5A623]">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#F5A623" />)}
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">4.9 / 5 Rating</p>
                <p className="text-white/50 text-xs mt-0.5">25,000+ satisfied patients</p>
              </div>
            </div>

            {/* Slots / phone */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {slotsLeft !== undefined && slotsLeft > 0 && (
                <div className="flex items-center gap-2 text-sm font-bold text-[#F5A623]">
                  <span className="w-2 h-2 bg-[#F5A623] rounded-full animate-pulse" />
                  Only {slotsLeft} slots left this week
                </div>
              )}
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white transition"
                >
                  <Phone size={14} /> {phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: form ── */}
        <div className="px-8 py-14 md:py-20 flex flex-col justify-center bg-[#f6faff] md:bg-white">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#0B2560] mb-2">You&apos;re All Set!</h3>
              <p className="text-gray-500">{successMessage}</p>
              <p className="text-sm text-[#3B82C4] font-semibold mt-4 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-[#3B82C4] rounded-full animate-pulse" />
                Our team will contact you shortly.
              </p>
            </div>
          ) : (
            <div className="max-w-md w-full mx-auto">
              <h3 className="text-xl font-extrabold text-[#0B2560] mb-1">Get Your Free Slot</h3>
              <p className="text-sm text-gray-400 mb-7">No credit card · No commitment · 100% free</p>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                {displayFields.map((field) => (
                  <div key={field.id}>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        value={form[field.id] || ''}
                        onChange={(e) => set(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] resize-none transition"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={form[field.id] || ''}
                        onChange={(e) => set(field.id, e.target.value)}
                        required={field.required}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
                      >
                        <option value="">{field.placeholder || `Select ${field.label}`}</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={form[field.id] || ''}
                        onChange={(e) => set(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-6 py-4 rounded-2xl text-base shadow-xl shadow-[#F5A623]/25 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Submitting…
                    </>
                  ) : submitText}
                </button>

                <p className="text-center text-[10px] text-gray-400 mt-2">
                  🔒 Your information is 100% secure and never shared.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
