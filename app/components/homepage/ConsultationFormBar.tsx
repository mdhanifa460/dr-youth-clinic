'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackBookingConversion } from '@/app/lib/trackConversion';
import { isValidIndianMobile, INVALID_MOBILE_MESSAGE } from '@/app/lib/phone';

export default function ConsultationFormBar({ data }: { data: any }) {
  const {
    headline = 'Start Your Transformation Today',
    subtext = 'Book your consultation and take the first step towards healthier skin & confident you.',
    services = [],
    cities = [],
    ctaText = 'Book Your Consultation',
  } = data || {};

  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !service || !city) return;
    if (!isValidIndianMobile(phone)) { setError(INVALID_MOBILE_MESSAGE); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, service, location: city.toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        trackBookingConversion({ bookingId: data.bookingId, service, location: city });
        // Same post-booking destination as the dedicated /book page's own
        // form (app/(public)/book/Form.tsx) — a real Booking row now
        // exists with this exact ID, so every place that creates one sends
        // the visitor to the same confirmation page instead of stranding
        // them on an inline message with no way back to their booking.
        router.push(`/book/success/${data.bookingId}`);
      } else {
        setError(data.message || 'Booking failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#f6faff] border-y border-[#e8eff7] py-10 md:py-12 lg:py-14" id="booking">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-[0_12px_35px_rgba(11,37,96,0.08)] ring-1 ring-[#e8eff7] p-4 sm:p-5 md:p-6 lg:p-8">
          <div className="grid lg:grid-cols-[0.85fr_2fr] gap-5 md:gap-6 items-center">
            {/* TEXT */}
            <div>
              <p className="text-[#0B2560] font-bold text-lg md:text-xl leading-snug">{headline}</p>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">{subtext}</p>
            </div>

            {/* FORM */}
            {sent ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-bold text-lg">Booking request sent!</p>
                <p className="text-gray-500 text-sm mt-1">Our team will contact you shortly.</p>
                <button onClick={() => setSent(false)} className="mt-3 min-h-11 px-4 text-[#0B2560] text-sm font-semibold underline">
                  Book another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
                {error && (
                  <p className="sm:col-span-2 lg:col-span-5 text-red-600 text-sm font-medium">{error}</p>
                )}
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-12 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0B2560] placeholder:text-gray-500 focus:outline-none focus:border-[#0B2560] focus:ring-2 focus:ring-[#0B2560]/15 transition"
                  required
                />
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="min-h-12 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0B2560] placeholder:text-gray-500 focus:outline-none focus:border-[#0B2560] focus:ring-2 focus:ring-[#0B2560]/15 transition"
                  required
                />
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="min-h-12 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 focus:outline-none focus:border-[#0B2560] focus:ring-2 focus:ring-[#0B2560]/15 transition"
                  required
                >
                  <option value="">Select Service</option>
                  {services.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="min-h-12 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 focus:outline-none focus:border-[#0B2560] focus:ring-2 focus:ring-[#0B2560]/15 transition"
                  required
                >
                  <option value="">Select City</option>
                  {cities.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-12 bg-[#0B2560] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#0d2d73] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(11,37,96,0.22)] transition-all duration-300 disabled:opacity-60 disabled:hover:translate-y-0 whitespace-nowrap flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1"
                >
                  {loading ? 'Sending...' : ctaText}
                  {!loading && <span>→</span>}
                </button>
              </form>
            )}
          </div>


        </div>
      </div>
    </section>
  );
}
