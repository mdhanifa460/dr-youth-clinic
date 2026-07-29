'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Calendar, Clock, MapPin, Stethoscope, CheckCircle, RotateCcw } from 'lucide-react';

const LOCATION_LABELS: Record<string, string> = {
  chennai: 'Chennai', bangalore: 'Bangalore', coimbatore: 'Coimbatore', kochi: 'Kochi', all: 'Any clinic',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:        { label: 'Received',   color: 'bg-gray-100 text-gray-600' },
  contacted:  { label: 'Contacted',  color: 'bg-blue-50 text-blue-600' },
  follow_up:  { label: 'Follow-up',  color: 'bg-amber-50 text-amber-600' },
  confirmed:  { label: 'Confirmed',  color: 'bg-emerald-50 text-emerald-600' },
  arrived:    { label: 'Arrived',    color: 'bg-emerald-50 text-emerald-600' },
  completed:  { label: 'Completed',  color: 'bg-[#0B2560]/10 text-[#0B2560]' },
  no_show:    { label: 'No-show',    color: 'bg-red-50 text-red-500' },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-50 text-red-500' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.new;
  return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

export default function MyAppointmentsPage() {
  const [phone, setPhone] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const [showReschedule, setShowReschedule] = useState(false);
  const [reqDate, setReqDate] = useState('');
  const [reqTime, setReqTime] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [reqSaving, setReqSaving] = useState(false);
  const [reqMessage, setReqMessage] = useState('');
  const [reqError, setReqError] = useState('');

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch('/api/my-appointments/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, bookingId }),
      });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.message || 'Booking not found');
    } catch { setError('Network error — please try again.'); }
    finally { setLoading(false); }
  };

  const submitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDate || !reqTime) return;
    setReqSaving(true); setReqError(''); setReqMessage('');
    try {
      const res = await fetch('/api/my-appointments/reschedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, bookingId, requestedDate: reqDate, requestedTime: reqTime, note: reqNote }),
      });
      const json = await res.json();
      if (json.success) {
        setReqMessage(json.message);
        setShowReschedule(false);
        setData((prev: any) => prev ? { ...prev, current: { ...prev.current, rescheduleRequest: { requestedDate: reqDate, requestedTime: reqTime, note: reqNote, requestedAt: new Date().toISOString() } } } : prev);
      } else setReqError(json.message || 'Could not send your request');
    } catch { setReqError('Network error — please try again.'); }
    finally { setReqSaving(false); }
  };

  return (
    <main className="bg-[#F5F1EC] min-h-screen">
      <section className="bg-[#0B2560] text-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/60 text-sm hover:text-white transition mb-6">
            <ChevronLeft size={15} /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold leading-tight mb-3">My Appointments</h1>
          <p className="text-white/70 text-sm md:text-base max-w-xl">
            Enter the phone number you booked with and your Booking ID (from your WhatsApp confirmation) to view or reschedule your appointment.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {!data ? (
          <form onSubmit={lookup} className="bg-white rounded-2xl border border-[#EBE8E3] p-6 md:p-8 shadow-sm space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Mobile Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
                placeholder="e.g. 98765 43210"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Booking ID</label>
              <input type="text" value={bookingId} onChange={(e) => setBookingId(e.target.value)} required
                placeholder="e.g. DR-1234567890"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560]" />
              <p className="text-[11px] text-gray-500 mt-1.5">Sent to you on WhatsApp right after you booked.</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full min-h-12 bg-[#0B2560] text-white rounded-xl font-bold text-sm hover:bg-[#12345c] transition disabled:opacity-60">
              {loading ? 'Looking up…' : 'Find My Booking'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <button onClick={() => { setData(null); setReqMessage(''); }} className="text-sm text-[#0B2560] font-semibold hover:underline flex items-center gap-1.5">
              <ChevronLeft size={14} /> Look up a different booking
            </button>

            {reqMessage && (
              <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle size={15} /> {reqMessage}
              </p>
            )}

            {/* Current booking */}
            <div className="bg-white rounded-2xl border border-[#EBE8E3] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Booking ID</p>
                  <p className="text-sm font-bold text-[#0B2560]">{data.current.bookingId}</p>
                </div>
                <StatusPill status={data.current.status} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2.5">
                  <Stethoscope size={15} className="text-[#3B82C4] shrink-0" />
                  <span className="text-gray-700">{data.current.service || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={15} className="text-[#3B82C4] shrink-0" />
                  <span className="text-gray-700">{LOCATION_LABELS[data.current.location] || data.current.location}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar size={15} className="text-[#3B82C4] shrink-0" />
                  <span className="text-gray-700">{data.current.date || 'To be scheduled'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={15} className="text-[#3B82C4] shrink-0" />
                  <span className="text-gray-700">{data.current.time || 'To be scheduled'}</span>
                </div>
              </div>

              {data.current.rescheduleRequest ? (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs font-bold text-amber-600 flex items-center gap-1.5"><RotateCcw size={12} /> Reschedule request pending</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You asked for {data.current.rescheduleRequest.requestedDate} at {data.current.rescheduleRequest.requestedTime}. Our team will confirm shortly.
                  </p>
                </div>
              ) : data.current.status !== 'cancelled' && data.current.status !== 'completed' ? (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  {!showReschedule ? (
                    <button onClick={() => setShowReschedule(true)}
                      className="text-sm font-semibold text-[#0B2560] hover:underline flex items-center gap-1.5">
                      <RotateCcw size={14} /> Request a different date/time
                    </button>
                  ) : (
                    <form onSubmit={submitReschedule} className="space-y-3">
                      {reqError && <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{reqError}</p>}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input type="date" value={reqDate} onChange={(e) => setReqDate(e.target.value)} required
                          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                        <input type="time" value={reqTime} onChange={(e) => setReqTime(e.target.value)} required
                          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                      </div>
                      <textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} rows={2} placeholder="Anything else we should know? (optional)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={reqSaving}
                          className="min-h-10 px-4 bg-[#0B2560] text-white rounded-xl font-bold text-xs hover:bg-[#12345c] transition disabled:opacity-60">
                          {reqSaving ? 'Sending…' : 'Send Request'}
                        </button>
                        <button type="button" onClick={() => setShowReschedule(false)}
                          className="min-h-10 px-4 text-gray-500 text-xs font-semibold hover:text-gray-700">
                          Cancel
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">This sends a request to our team — your slot won't change until they confirm it.</p>
                    </form>
                  )}
                </div>
              ) : null}
            </div>

            {/* Past visits */}
            {data.history.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-[#0B2560] mb-3">Past Bookings</h2>
                <div className="space-y-2">
                  {data.history.map((h: any) => (
                    <div key={h.bookingId} className="bg-white rounded-xl border border-[#EBE8E3] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{h.service || 'Not specified'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {LOCATION_LABELS[h.location] || h.location} · {h.date || 'No date'} {h.time && `· ${h.time}`}
                        </p>
                      </div>
                      <StatusPill status={h.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
