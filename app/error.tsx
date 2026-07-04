'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f6faff] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-[#0B2560] mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          An unexpected error occurred. Please try again — if the problem persists, contact our team.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="bg-[#0B2560] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:-translate-y-0.5 transition"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-gray-200 text-[#0B2560] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
