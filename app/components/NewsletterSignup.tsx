'use client';

import { useState } from 'react';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';

export default function NewsletterSignup({ source = 'blog' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Something went wrong');
      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong — please try again');
    }
  };

  return (
    <section className="bg-[#0B2560] rounded-3xl px-6 py-10 md:py-12 md:px-12 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Stay Informed</p>
      <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">Get Expert Tips in Your Inbox</h2>
      <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
        Skin & hair care tips, new treatment guides, and offers — no spam, unsubscribe anytime.
      </p>

      {status === 'done' ? (
        <div className="flex items-center justify-center gap-2 text-white font-semibold max-w-md mx-auto">
          <CheckCircle size={18} className="text-[#F5A623]" /> You&apos;re subscribed! Check your inbox.
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
          <div className="relative flex-1 w-full">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg disabled:opacity-60 shrink-0"
          >
            {status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : null}
            Subscribe
          </button>
        </form>
      )}
      {status === 'error' && <p className="text-red-300 text-xs mt-3">{message}</p>}
    </section>
  );
}
