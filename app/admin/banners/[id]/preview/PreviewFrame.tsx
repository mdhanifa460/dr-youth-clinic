"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

// Lightweight device-frame simulator for the banner preview page —
// replaces the previous "resize your browser tab" instruction with an
// actual affordance. Desktop is just the page's natural full width;
// mobile constrains to a phone-ish 390px column (iPhone-class viewport
// width) so an admin can check the Flash Offer Popup's stacked mobile
// layout without touching their actual window size.
export default function PreviewFrame({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-amber-700">
          Preview only — nothing here is saved or published.
        </p>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-amber-200 p-0.5">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              device === "desktop" ? "bg-[#0B2560] text-white" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Monitor size={13} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              device === "mobile" ? "bg-[#0B2560] text-white" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Smartphone size={13} /> Mobile
          </button>
        </div>
      </div>

      {device === "mobile" ? (
        <div className="bg-gray-100 min-h-[calc(100vh-41px)] flex justify-center py-6">
          {/* relative + an explicit min-height, since HomepageOfferSplash's
              popup renders as position:absolute (not fixed) in preview
              mode specifically so it fills THIS simulated phone screen
              instead of the real, full-width browser viewport. */}
          <div className="relative w-[390px] max-w-full min-h-[780px] bg-white shadow-xl overflow-hidden">
            {children}
          </div>
        </div>
      ) : (
        <div className="relative min-h-[calc(100vh-41px)]">{children}</div>
      )}
    </div>
  );
}
