"use client";

import { useState } from "react";
import { resultsData } from "../data/results";
import BeforeAfterSlider from "./BeforeAfterSlider";
import ImagePreviewModal from "./ImagePreviewModal";

const tabs = ["all", "skin", "hair", "laser"];

export default function ResultsSection() {
  const [activeTab, setActiveTab] = useState("all");

  const [preview, setPreview] = useState<{
    before: string;
    after: string;
  } | null>(null);

  // FILTER DATA
  const filtered =
    activeTab === "all"
      ? resultsData
      : resultsData.filter((item) => item.category === activeTab);

  // FEATURED + OTHERS
  const featured = filtered.find((item) => item.featured) || filtered[0];
  const others = filtered.filter((item) => item.id !== featured?.id);

  return (
    <section className="py-24 px-6 md:px-10 bg-background">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* HEADER */}
        <div>
          <h2 className="text-5xl font-extrabold text-primary leading-tight">
            Before & After <br />
            <span className="text-secondary">Results</span>
          </h2>

          <p className="text-gray-600 mt-4 max-w-2xl">
            Witness real transformations from our treatments.
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-3 bg-surface-container-low p-2 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg capitalize transition ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* 🔥 FEATURED BIG CARD */}
          {featured && (
            <div className="lg:col-span-7 bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden">

              <div
                className="h-[400px] cursor-pointer"
                onClick={() => setPreview(featured)}
              >
                <BeforeAfterSlider
                  before={featured.before}
                  after={featured.after}
                />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-primary">
                  {featured.title}
                </h3>

                <p className="text-gray-500 mt-2">
                  Duration: {featured.duration}
                </p>
              </div>

            </div>
          )}

          {/* 🔹 SIDE CARDS */}
          <div className="lg:col-span-5 grid gap-6">
            {others.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden"
              >

                <div
                  className="h-32 cursor-pointer"
                  onClick={() => setPreview(item)}
                >
                  <BeforeAfterSlider
                    before={item.before}
                    after={item.after}
                  />
                </div>

                <div className="p-4">
                  <h4 className="font-semibold text-primary text-sm">
                    {item.title}
                  </h4>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 🔥 FULLSCREEN MODAL */}
      <ImagePreviewModal
        isOpen={!!preview}
        before={preview?.before || ""}
        after={preview?.after || ""}
        onClose={() => setPreview(null)}
      />
    </section>
  );
}