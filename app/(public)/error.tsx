'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, Calendar } from 'lucide-react';

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[PublicError]', error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-md w-full text-center">

        <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={28} className="text-red-400" />
        </div>

        <h1 className="text-2xl font-headline font-extrabold text-[#0B2560] mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          We hit an unexpected error. Please try again — if the problem persists, contact us directly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={reset}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-md">
            <RefreshCw size={13} /> Try Again
          </button>
          <Link href="/"
            className="flex items-center gap-2 border border-gray-200 text-[#0B2560] px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition">
            <Home size={13} /> Back to Home
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-3">Or reach us directly</p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link href="/book" className="flex items-center gap-1 text-[#3B82C4] hover:underline font-semibold">
              <Calendar size={11} /> Book Consultation
            </Link>
            <span className="text-gray-300">·</span>
            <a href="tel:18008909669" className="text-[#3B82C4] hover:underline font-semibold">
              1800 890 9669
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
