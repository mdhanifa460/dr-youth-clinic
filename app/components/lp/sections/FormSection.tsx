'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader, CheckCircle, Phone, Star, ShieldCheck } from 'lucide-react';
import { useIdempotencyKey } from '@/app/lib/useIdempotencyKey';

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
  // Anchor id other sections scroll to via getElementById — defaults to the
  // historical 'lp-form' so every existing caller is unaffected. Only needs
  // overriding if this section is placed somewhere that isn't paired with
  // the default-anchored CTA/Doctor/Offer sections on the same page.
  formAnchorId?: string;
  // Drives the "Free Consultation" eyebrow tag below, plus the submitText/
  // headline defaults — same Settings -> Free Labels switch the rest of the
  // site respects (app/lib/siteConfig.ts's consultationFree/consultationCta).
  consultationFree: boolean;
}

export default function FormSection({
  data,
  fields,
  submitText,
  successMessage = "Thank you! We'll call you within 2 hours.",
  slug,
  variant = 'A',
  formAnchorId = 'lp-form',
  consultationFree,
}: FormSectionProps) {
  const {
    headline = consultationFree ? 'Book Your Free Consultation' : 'Book Your Consultation',
    subtext = "Fill in your details and we'll call you within 2 hours.",
    slotsLeft,
    phone,
  } = data;
  const resolvedSubmitText = submitText || (consultationFree ? 'Book Free Consultation' : 'Book Consultation');

  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const getIdempotencyKey = useIdempotencyKey();

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/lp/${slug}/lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': getIdempotencyKey({ slug, variant, form }),
        },
        body: JSON.stringify({
          name: form['name'] || form['full-name'] || '',
          phone: form['phone'] || form['mobile'] || form['tel'] || '',
          email: form['email'] || '',
          fields: form,
          variant,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Same post-booking destination as every other booking-creating
        // flow (see ConsultationFormBar.tsx / AiChatWidget.tsx) — a real
        // Booking row now exists with this exact ID. Keep the inline
        // "You're All Set!" card as a fallback for the edge case where
        // the API reports success with no bookingId, so this never
        // navigates to a broken /book/success/undefined.
        if (json.bookingId) router.push(`/book/success/${json.bookingId}`);
        else setSuccess(true);
      } else {
        setError(json.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayFields: FormField[] = fields.length
    ? fields
    : [
        { id: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name', required: true },
        { id: 'phone', label: 'Mobile Number', type: 'tel', placeholder: '10-digit mobile number', required: true },
        { id: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com', required: false },
      ];

  return (
    <section id={formAnchorId} className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-2xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-white rounded-3xl shadow-2xl shadow-[#0B2560]/10 p-6 md:p-10"
        >
          {success ? (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle size={42} className="text-green-500" />
              </motion.div>
              <h3 className="text-2xl font-extrabold text-[#0B2560] mb-2">You&apos;re All Set!</h3>
              <p className="text-gray-500">{successMessage}</p>
              <p className="text-sm text-[#3B82C4] font-semibold mt-4 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 bg-[#3B82C4] rounded-full animate-pulse" />
                Our team will contact you shortly.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-7">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#F5A623] bg-[#F5A623]/15 px-3 py-1.5 rounded-full mb-4">
                  <Star size={11} fill="#F5A623" /> {consultationFree ? 'Free Consultation' : 'Consultation'}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] leading-tight">{headline}</h2>
                <p className="text-gray-500 mt-3 text-sm md:text-base">{subtext}</p>
                {slotsLeft !== undefined && slotsLeft > 0 && (
                  <div className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-[#c47f10] bg-[#F5A623]/15 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 bg-[#F5A623] rounded-full animate-pulse" />
                    Only {slotsLeft} slots left this week
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
                {displayFields.map((field) => {
                  const fullWidth = field.type === 'textarea' || field.type === 'select' || field.type === 'email';
                  return (
                    <div key={field.id} className={fullWidth ? 'sm:col-span-2' : ''}>
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
                  );
                })}

                <button
                  type="submit"
                  disabled={submitting}
                  className="sm:col-span-2 w-full flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-6 py-4 rounded-2xl text-base shadow-xl shadow-[#F5A623]/25 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  {submitting ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    resolvedSubmitText
                  )}
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-5">
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ShieldCheck size={13} className="text-[#3B82C4]" />
                  100% secure &amp; never shared
                </p>
                {phone && (
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82C4] hover:underline"
                  >
                    <Phone size={13} /> {phone}
                  </a>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
