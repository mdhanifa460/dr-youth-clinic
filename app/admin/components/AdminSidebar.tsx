"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { canAccess, ROLE_LABELS, ROLE_COLORS, type AdminRole } from "@/app/lib/permissions";
import type { AdminUserPublic } from "@/app/lib/adminAuth";

type NavItem = {
  href: string;
  label: string;
  module: Parameters<typeof canAccess>[1];
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "📊 Dashboard", module: "dashboard", exact: true },
  { href: "/admin/intelligence", label: "🧠 AI Intelligence", module: "intelligence" },
  { href: "/admin/appointments", label: "🗓️ Appointments", module: "bookings" },
  { href: "/admin/bookings", label: "📋 Booking Leads", module: "bookings" },
  { href: "/admin/doctor-availability", label: "🚫 Dr. Availability", module: "bookings" },
  { href: "/admin/leads", label: "🎯 Lead Export", module: "leads" },
  { href: "/admin/services", label: "🩺 Services", module: "services" },
  { href: "/admin/doctors", label: "👨‍⚕️ Doctors", module: "doctors" },
  { href: "/admin/homepage", label: "🏠 Homepage", module: "homepage" },
  { href: "/admin/locations", label: "📍 Locations", module: "locations" },
  { href: "/admin/offers", label: "🏷️ Offers", module: "offers" },
  { href: "/admin/reviews", label: "⭐ Reviews", module: "reviews" },
  { href: "/admin/blog", label: "✍️ Blog Posts", module: "blog" },
  { href: "/admin/seo", label: "🔍 SEO", module: "seo" },
  { href: "/admin/landing-pages", label: "🚀 Landing Pages", module: "landing-pages" },
  { href: "/admin/quiz", label: "🧴 Quiz", module: "services" },
  { href: "/admin/team", label: "👥 Team", module: "team" },
  { href: "/admin/settings", label: "⚙ Settings", module: "settings" },
];

export default function AdminSidebar({ user }: { user: AdminUserPublic }) {
  const path = usePathname();
  const router = useRouter();
  const role = user.role as AdminRole;

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const item = ({ href, label, exact = false }: NavItem) => (
    <Link
      key={href}
      href={href}
      className={`block px-3 py-2 rounded ${
        (exact ? path === href : path.startsWith(href))
          ? "bg-white text-[#0B2545] font-semibold"
          : "hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );

  const visible = NAV_ITEMS.filter((n) => canAccess(role, n.module));

  return (
    <aside className="w-64 shrink-0 bg-[#0B2545] text-white p-6 flex flex-col">
      <h1 className="text-xl font-bold tracking-normal mb-6">DR Youth Admin</h1>

      <nav className="space-y-1 flex-1">
        {visible.map((n, i) => {
          const isDividerBefore =
            i > 0 &&
            (n.module === "bookings" || n.module === "team" || n.module === "settings");
          return (
            <div key={n.href}>
              {isDividerBefore && <div className="border-t border-white/10 my-1" />}
              {item(n)}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4 space-y-2">
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
