'use client';

import { useEffect } from 'react';

export default function AdminError({
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
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-[#0B2560] mb-2">Admin error</h1>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred in the admin panel.'}
        </p>
        <button
          onClick={reset}
          className="bg-[#0B2560] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#0d2d73] transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
