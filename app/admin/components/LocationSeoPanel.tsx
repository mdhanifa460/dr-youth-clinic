"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw, Pencil, Inbox } from "lucide-react";
import MetaSuggestions from "./MetaSuggestions";

interface LocationSeoOverride {
  location: string;
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  isCustomized: boolean;
}

const CITY_LABEL: Record<string, string> = {
  chennai: "Chennai",
  bangalore: "Bangalore",
  coimbatore: "Coimbatore",
  kochi: "Kochi",
};

export default function LocationSeoPanel({
  cities,
  serviceName,
  category,
  sharedTitle,
  sharedDescription,
  sharedSlug,
  locationSeo,
  onChange,
}: {
  cities: string[];
  serviceName: string;
  category: string;
  sharedTitle: string;
  sharedDescription: string;
  sharedSlug: string;
  locationSeo: LocationSeoOverride[];
  onChange: (next: LocationSeoOverride[]) => void;
}) {
  const [openCity, setOpenCity] = useState<string | null>(null);

  const overrideFor = (city: string) => locationSeo.find((l) => l.location === city);

  const setOverride = (city: string, patch: Partial<LocationSeoOverride>) => {
    const existing = overrideFor(city);
    const next = existing
      ? locationSeo.map((l) => (l.location === city ? { ...l, ...patch, isCustomized: true } : l))
      : [
          ...locationSeo,
          {
            location: city,
            metaTitle: sharedTitle,
            metaDescription: sharedDescription,
            urlSlug: sharedSlug,
            isCustomized: true,
            ...patch,
          },
        ];
    onChange(next);
  };

  const resetCity = (city: string) => {
    onChange(locationSeo.filter((l) => l.location !== city));
  };

  if (cities.length <= 1) return null;

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 bg-[#fafbff] border-b border-gray-100">
        <p className="font-bold text-gray-700 text-sm">Per-City SEO</p>
        <p className="text-xs text-gray-400 mt-0.5">
          This service shows at {cities.length} cities sharing the same treatment content. Each city inherits the
          title/description/URL above by default — customize any city below to help it rank independently.
        </p>
      </div>

      <div className="divide-y divide-gray-50">
        {cities.map((city) => {
          const override = overrideFor(city);
          const isOpen = openCity === city;
          const title = override?.metaTitle || sharedTitle;
          const description = override?.metaDescription || sharedDescription;
          const slug = override?.urlSlug || sharedSlug;

          return (
            <div key={city}>
              <button
                type="button"
                onClick={() => setOpenCity(isOpen ? null : city)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50/60 transition"
              >
                <span className="font-semibold text-[#0B2560] text-sm w-24 shrink-0">{CITY_LABEL[city] ?? city}</span>
                <span className="flex-1 min-w-0 text-xs text-gray-400 truncate">{title || "No title yet"}</span>
                {override?.isCustomized ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#0B2560] bg-[#0B2560]/10 px-2 py-1 rounded-full shrink-0">
                    <Pencil size={9} /> Customized
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full shrink-0">
                    <Inbox size={9} /> Inherited
                  </span>
                )}
                <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 space-y-4 bg-gray-50/40">
                  {override?.isCustomized && (
                    <button
                      type="button"
                      onClick={() => resetCity(city)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-red-500 transition"
                    >
                      <RotateCcw size={11} /> Reset to shared default
                    </button>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Meta Title for {CITY_LABEL[city] ?? city} <span className="text-gray-400 font-normal">{title.length}/60</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setOverride(city, { metaTitle: e.target.value })}
                      maxLength={60}
                      placeholder={sharedTitle}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Meta Description for {CITY_LABEL[city] ?? city} <span className="text-gray-400 font-normal">{description.length}/160</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setOverride(city, { metaDescription: e.target.value })}
                      maxLength={160}
                      rows={2}
                      placeholder={sharedDescription}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL Slug for {CITY_LABEL[city] ?? city}</label>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-gray-400 font-mono">/{city}/services/{category?.toLowerCase() || "category"}/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setOverride(city, { urlSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                        placeholder={sharedSlug}
                        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <MetaSuggestions
                    serviceName={serviceName}
                    category={category}
                    location={city}
                    onApply={(t, d) => setOverride(city, { metaTitle: t, metaDescription: d })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
