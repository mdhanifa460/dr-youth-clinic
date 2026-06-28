"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Booking = {
  _id: string;
  name?: string;
  phone?: string;
  service?: string;
  location?: string;
  date?: string;
  status?: string;
};

type Review = {
  _id: string;
  authorName?: string;
  rating?: number;
  reviewText?: string;
  source?: string;
  isVisible?: boolean;
  createdAt?: string;
};

type Stats = {
  todayBookings: number;
  pendingLeads: number;
  totalBookings: number;
  newReviews: number;
  services: number;
  locations: number;
};

type DashboardData = {
  stats: Stats;
  recentBookings: Booking[];
  recentReviews: Review[];
};

// ─── Skeleton primitives ──────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

// ─── Stat cards ───────────────────────────────────────────────────────────────
const STAT_CONFIG = [
  { key: "todayBookings",  label: "Today's Bookings", icon: "📅", href: "/admin/bookings",          color: "bg-blue-50   border-blue-200",   val: "text-blue-700"   },
  { key: "pendingLeads",   label: "Pending Leads",    icon: "⏳", href: "/admin/bookings?status=new", color: "bg-amber-50  border-amber-200",  val: "text-amber-700"  },
  { key: "totalBookings",  label: "Total Bookings",   icon: "📋", href: "/admin/bookings",          color: "bg-indigo-50 border-indigo-200",  val: "text-indigo-700" },
  { key: "newReviews",     label: "New Reviews (7d)", icon: "⭐", href: "/admin/reviews",           color: "bg-yellow-50 border-yellow-200",  val: "text-yellow-700" },
  { key: "services",       label: "Active Services",  icon: "🩺", href: "/admin/services",          color: "bg-green-50  border-green-200",   val: "text-green-700"  },
  { key: "locations",      label: "Locations",        icon: "📍", href: "/admin/locations",         color: "bg-rose-50   border-rose-200",    val: "text-rose-700"   },
] as const;

function StatCards({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {STAT_CONFIG.map((c) => (
        <Link key={c.key} href={c.href}>
          <div className={`rounded-xl border p-5 transition hover:shadow-md cursor-pointer ${c.color}`}>
            <span className="text-2xl">{c.icon}</span>
            <div className="mt-3">
              {loading ? (
                <Skeleton className="h-9 w-14 mb-1" />
              ) : (
                <p className={`text-3xl font-bold ${c.val}`}>{stats?.[c.key] ?? "—"}</p>
              )}
              <p className="text-sm font-medium text-gray-600 mt-1">{c.label}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  new:       "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  done:      "bg-gray-100 text-gray-600",
};

function StatusBadge({ status = "new" }: { status?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ─── Recent bookings table ────────────────────────────────────────────────────
function RecentBookings({ bookings, loading }: { bookings: Booking[]; loading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Recent Bookings</h2>
        <Link href="/admin/bookings" className="text-xs font-medium text-[#0B2545] hover:underline">
          View all →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Patient</th>
              <th className="px-6 py-3 text-left">Service</th>
              <th className="px-6 py-3 text-left">Location</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-6 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  </tr>
                ))
              : bookings.length === 0
              ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                      No bookings yet
                    </td>
                  </tr>
                )
              : bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{b.name || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{b.service || "—"}</td>
                    <td className="px-6 py-3 text-gray-600 capitalize">{b.location || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{b.date || "—"}</td>
                    <td className="px-6 py-3"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Recent reviews ───────────────────────────────────────────────────────────
function Stars({ rating = 0 }: { rating?: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(Math.min(rating, 5))}{"☆".repeat(Math.max(0, 5 - rating))}
    </span>
  );
}

function RecentReviews({ reviews, loading }: { reviews: Review[]; loading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Recent Reviews</h2>
        <Link href="/admin/reviews" className="text-xs font-medium text-[#0B2545] hover:underline">
          View all →
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))
          : reviews.length === 0
          ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No reviews yet</p>
            )
          : reviews.map((r) => (
              <div key={r._id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 text-sm">{r.authorName || "Anonymous"}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.isVisible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.isVisible ? "Visible" : "Hidden"}
                  </span>
                </div>
                <Stars rating={r.rating} />
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.reviewText || "—"}</p>
              </div>
            ))}
      </div>
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────
const ACTIONS = [
  { label: "View Bookings",  href: "/admin/bookings",     primary: true  },
  { label: "Add Service",    href: "/admin/services/new", primary: false },
  { label: "Manage Reviews", href: "/admin/reviews",      primary: false },
  { label: "Edit Homepage",  href: "/admin/homepage",     primary: false },
];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Could not load dashboard. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2">
          {ACTIONS.map((a) => (
            <Link key={a.href} href={a.href}>
              <button className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                a.primary
                  ? "bg-[#0B2545] text-white hover:bg-[#12345c]"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}>
                {a.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Stats */}
      <StatCards stats={data?.stats ?? null} loading={loading} />

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentBookings bookings={data?.recentBookings ?? []} loading={loading} />
        </div>
        <div>
          <RecentReviews reviews={data?.recentReviews ?? []} loading={loading} />
        </div>
      </div>

    </div>
  );
}
