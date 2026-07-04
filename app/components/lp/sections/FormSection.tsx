'use client';

import { useState } from 'react';
import { Loader, CheckCircle } from 'lucide-react';

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
}

interface FormSectionProps {
  data: FormSectionData;
  fields: FormField[];
  submitText?: string;
  successMessage?: string;
  slug: string;
  variant?: 'A' | 'B';
}

export default function FormSection({
  data,
  fields,
  submitText = 'Book Free Consultation',
  successMessage = "Thank you! We'll call you within 2 hours.",
  slug,
  variant = 'A',
}: FormSectionProps) {
  const { headline = 'Book Your Free Consultation', subtext = "Fill in your details and we'll call you within 2 hours." } = data;

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
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Default fields if none configured
  const displayFields: FormField[] = fields.length
    ? fields
    : [
        { id: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name', required: true },
        { id: 'phone', label: 'Mobile Number', type: 'tel', placeholder: '10-digit mobile number', required: true },
        { id: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com', required: false },
      ];

  return (
    <section id="lp-form" className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-xl mx-auto px-5">
        <div className="text-center mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Get Started
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 text-sm mt-2">{subtext}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-[#e0ecf8] p-6 md:p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle size={56} className="text-green-500" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0B2560] mb-2">You&apos;re All Set!</h3>
              <p className="text-gray-600">{successMessage}</p>
              <p className="text-sm text-[#3B82C4] font-semibold mt-4">
                Our team will contact you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

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
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] resize-none transition"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={form[field.id] || ''}
                      onChange={(e) => set(field.id, e.target.value)}
                      required={field.required}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
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
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
                    />
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-[#0B2560] hover:bg-[#1a3a7a] text-white font-extrabold px-6 py-4 rounded-2xl text-base shadow-xl shadow-[#0B2560]/20 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : submitText}
              </button>

              <p className="text-center text-[10px] text-gray-400 mt-3">
                🔒 Your information is secure and will not be shared with third parties.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
