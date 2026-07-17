"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { canAccess, ROLE_LABELS, ROLE_COLORS, type AdminRole } from "@/app/lib/permissions";
import type { AdminUserPublic } from "@/app/lib/adminAuth";
import ThemeSwitcher from "./ThemeSwitcher";

type NavItem = {
  href: string;
  label: string;
  module: Parameters<typeof canAccess>[1];
  exact?: boolean;
  countKey?: "services" | "landingPages" | "videos";
};

type NavGroup = {
  label: string | null; // null = ungrouped items shown at the very top
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "📊 Dashboard", module: "dashboard", exact: true }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/homepage", label: "🏠 Homepage", module: "homepage" },
      { href: "/admin/about", label: "📖 About Page", module: "homepage" },
      { href: "/admin/banners", label: "🎯 Banners", module: "banners" },
      { href: "/admin/landing-pages", label: "🚀 Landing Pages", module: "landing-pages", countKey: "landingPages" },
      { href: "/admin/services", label: "🩺 Services", module: "services", countKey: "services" },
      { href: "/admin/locations", label: "📍 Locations", module: "locations" },
      { href: "/admin/doctors", label: "👨‍⚕️ Doctors", module: "doctors" },
      { href: "/admin/blog", label: "✍️ Blog Posts", module: "blog" },
      { href: "/admin/videos", label: "🎥 Video Academy", module: "videos", countKey: "videos" },
      { href: "/admin/offers", label: "🏷️ Offers", module: "offers" },
      { href: "/admin/reviews", label: "⭐ Reviews", module: "reviews" },
      { href: "/admin/media", label: "🖼️ Media Library", module: "services" },
    ],
  },
  {
    label: "Patients",
    items: [
      { href: "/admin/appointments", label: "🗓️ Appointments", module: "bookings" },
      { href: "/admin/bookings", label: "📋 Booking Leads", module: "bookings" },
      { href: "/admin/leads", label: "🎯 Lead Export", module: "leads" },
      { href: "/admin/doctor-availability", label: "🚫 Dr. Availability", module: "bookings" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/intelligence", label: "🧠 AI Intelligence", module: "intelligence" },
      { href: "/admin/seo", label: "🔍 SEO", module: "seo" },
      { href: "/admin/ai-assessment", label: "✨ Clinical Intake", module: "ai-assessment" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/team", label: "👥 Team", module: "team" },
      { href: "/admin/settings", label: "⚙ Settings", module: "settings" },
    ],
  },
];

export default function AdminSidebar({ user }: { user: AdminUserPublic }) {
  const path = usePathname();
  const router = useRouter();
  const role = user.role as AdminRole;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/admin/nav-counts")
      .then((r) => r.json())
      .then((d) => setCounts(d))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const openSearch = () => window.dispatchEvent(new CustomEvent("open-command-palette"));

  const item = ({ href, label, exact = false, countKey }: NavItem) => {
    const isActive = exact ? path === href : path.startsWith(href);
    const count = countKey ? counts[countKey] : undefined;
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded border-l-2 transition-colors ${
          isActive
            ? "bg-white text-[#0B2545] font-semibold border-[#F5A623]"
            : "border-transparent hover:bg-white/10"
        }`}
      >
        <span>{label}</span>
        {!!count && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            isActive ? "bg-[#F5A623] text-[#0B2545]" : "bg-white/15 text-white"
          }`}>
            {count}
          </span>
        )}
      </Link>
    );
  };

  const visibleGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((n) => canAccess(role, n.module)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="w-64 shrink-0 bg-[#0B2545] text-white p-6 flex flex-col">
      <h1 className="text-xl font-bold tracking-normal mb-4">DR Youth Admin</h1>

      <button
        type="button"
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-2 mb-5 rounded bg-white/10 hover:bg-white/15 transition text-sm text-white/60"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-[10px] font-sans bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        {visibleGroups.map((g, gi) => (
          <div key={g.label ?? "top"} className={gi > 0 ? "pt-4" : ""}>
            {g.label && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
                {g.label}
              </p>
            )}
            <div className="space-y-1">{g.items.map(item)}</div>
          </div>
        ))}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4 space-y-2">
        <ThemeSwitcher />
        <Link
          href="/admin/profile"
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
            path === "/admin/profile" ? "bg-white text-[#0B2545] font-semibold" : "hover:bg-white/10"
          }`}
        >
          <span className="text-base">👤</span>
          <div className="min-w-0">
            <p className="font-semibold truncate leading-tight">{user.name}</p>
            <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm font-semibold hover:bg-white/15"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
