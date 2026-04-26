"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

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
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-[#0B2545] text-white p-6 space-y-6">
        <h1 className="text-xl font-bold">DR Youth Admin</h1>
        <nav className="space-y-2">
          {item("/admin", "📊 Dashboard")}
          {item("/admin/bookings", "📅 Bookings")}
          {item("/admin/settings", "⚙ Settings")}
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}