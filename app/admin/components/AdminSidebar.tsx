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
  { href: "/admin/bookings", label: "📅 Bookings", module: "bookings" },
  { href: "/admin/services", label: "🩺 Services", module: "services" },
  { href: "/admin/doctors", label: "👨‍⚕️ Doctors", module: "doctors" },
  { href: "/admin/homepage", label: "🏠 Homepage", module: "homepage" },
  { href: "/admin/locations", label: "📍 Locations", module: "locations" },
  { href: "/admin/offers", label: "🏷️ Offers", module: "offers" },
  { href: "/admin/reviews", label: "⭐ Reviews", module: "reviews" },
  { href: "/admin/blog", label: "✍️ Blog Posts", module: "blog" },
  { href: "/admin/seo", label: "🔍 SEO", module: "seo" },
  { href: "/admin/landing-pages", label: "🚀 Landing Pages", module: "landing-pages" },
  { href: "/admin/quiz", label: "🧴 Skin Quiz", module: "services" },
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

      <div className="mt-6 border-t border-white/10 pt-4 space-y-3">
        <div>
          <p className="text-sm font-semibold truncate">{user.name}</p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        </div>
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
