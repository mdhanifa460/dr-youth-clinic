"use client";

import { useEffect, useState } from "react";

type Stats = {
  enabled: boolean;
  todayLeads?: number;
  todayCompleted?: number;
  todayBookings?: number;
  pendingLeads?: number;
};

const TILES: { key: keyof Stats; label: string }[] = [
  { key: "todayLeads", label: "Today's Leads" },
  { key: "todayBookings", label: "Today's Bookings" },
  { key: "todayCompleted", label: "Today's Completed" },
  { key: "pendingLeads", label: "Pending Leads" },
];

export default function AdminAnalyticsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics-strip")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats({ enabled: false }));
  }, []);

  if (!stats || !stats.enabled) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {TILES.map(({ key, label }) => {
        const raw = stats[key];
        const value = typeof raw === "number" ? raw.toLocaleString("en-IN") : "—";
        return (
          <div key={key} className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
            <p className="text-lg font-extrabold text-[#0B2560]">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        );
      })}
    </div>
  );
}
