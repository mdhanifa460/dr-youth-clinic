'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function CourseEnquiryForm({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', practiceOrClinicName: '', city: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/course-enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, course: courseId }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm p-6 text-center">
        <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
        <p className="font-headline font-extrabold text-[#0B2560] text-base">Enquiry Sent</p>
        <p className="text-gray-500 text-sm mt-1.5">Our team will get back to you about {courseTitle} shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3.5">
      <p className="font-headline font-extrabold text-[#0B2560] text-base">Enquire About This Program</p>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
        <input
          type="text" required value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Your name"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mobile Number</label>
        <input
          type="tel" required value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="10-digit mobile number"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
        <input
          type="email" value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="you@clinic.com"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Practice / Clinic Name</label>
        <input
          type="text" value={form.practiceOrClinicName}
          onChange={(e) => setForm((f) => ({ ...f, practiceOrClinicName: e.target.value }))}
          placeholder="Where you currently practice"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">City</label>
        <input
          type="text" value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="Your city"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40"
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Message</label>
        <textarea
          rows={3} value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="Any questions about batches, fees, or eligibility?"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40 resize-none"
        />
      </div>
      <button
        type="submit" disabled={status === 'sending'}
        className="w-full py-3.5 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send Enquiry'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500 text-center">Something went wrong — please check your details and try again.</p>
      )}
    </form>
  );
}
