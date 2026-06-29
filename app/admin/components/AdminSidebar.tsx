"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminSidebar() {
  const path = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const item = (href: string, label: string) => (
    <Link
      href={href}
      className={`block px-3 py-2 rounded ${
        path === href ? "bg-white text-[#0B2545] font-semibold" : "hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <aside className="w-64 shrink-0 bg-[#0B2545] text-white p-6 space-y-6">
      <h1 className="text-xl font-bold tracking-normal">DR Youth Admin</h1>
      <nav className="space-y-2">
        {item("/admin", "📊 Dashboard")}
        {item("/admin/bookings", "📅 Bookings")}
        {item("/admin/services", "🩺 Services")}
        {item("/admin/homepage", "🏠 Homepage")}
        {item("/admin/locations", "📍 Locations")}
        {item("/admin/reviews", "⭐ Reviews")}
        {item("/admin/seo", "🔍 SEO")}
        {item("/admin/settings", "⚙ Settings")}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm font-semibold hover:bg-white/15"
      >
        Logout
      </button>
    </aside>
  );
}
