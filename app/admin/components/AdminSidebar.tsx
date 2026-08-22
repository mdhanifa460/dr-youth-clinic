"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";
import { canAccess, ROLE_LABELS, ROLE_COLORS, type AdminRole } from "@/app/lib/permissions";
import type { AdminUserPublic } from "@/app/lib/adminAuth";
import ThemeSwitcher from "./ThemeSwitcher";

type NavItem = {
  href: string;
  label: string;
  module: Parameters<typeof canAccess>[1];
  exact?: boolean;
  countKey?: "services" | "landingPages" | "videos" | "courses" | "animationAssets";
};

type NavGroup = {
  label: string | null; // null = ungrouped items shown at the very top, always expanded
  items: NavItem[];
};

// Split from one 18-item "Content" wall of links into smaller, named
// groups — same items, just organized so the sidebar isn't one long
// unbroken scroll (was ~1.9x a typical laptop viewport height before
// this). Groups collapse/expand (see CollapsibleGroup below); the group
// containing the current page auto-expands on load regardless of its
// remembered state, so navigating here never hides where you already are.
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin", label: "📊 Dashboard", module: "dashboard", exact: true },
      { href: "/admin/content-health", label: "🩺 Content Health", module: "dashboard" },
    ],
  },
  {
    label: "Pages & Layout",
    items: [
      { href: "/admin/homepage", label: "🏠 Homepage", module: "homepage" },
      { href: "/admin/about", label: "📖 About Page", module: "homepage" },
      { href: "/admin/landing-pages", label: "🚀 Landing Pages", module: "landing-pages", countKey: "landingPages" },
      { href: "/admin/banners", label: "🎯 Banners", module: "banners" },
      { href: "/admin/animation-library", label: "🎞️ Animation Library", module: "animation-library", countKey: "animationAssets" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/services", label: "🩺 Services", module: "services", countKey: "services" },
      { href: "/admin/locations", label: "📍 Locations", module: "locations" },
      { href: "/admin/doctors", label: "👨‍⚕️ Doctors", module: "doctors" },
      { href: "/admin/offers", label: "🏷️ Offers", module: "offers" },
      { href: "/admin/results", label: "📸 Results", module: "results" },
    ],
  },
  {
    label: "Content & Media",
    items: [
      { href: "/admin/blog", label: "✍️ Blog Posts", module: "blog" },
      { href: "/admin/stories", label: "📱 Web Stories", module: "stories" },
      { href: "/admin/videos", label: "🎥 Video Academy", module: "videos", countKey: "videos" },
      { href: "/admin/courses", label: "🎓 Certification Programs", module: "courses", countKey: "courses" },
      { href: "/admin/courses/enquiries", label: "📩 Program Enquiries", module: "courses" },
      { href: "/admin/media", label: "🖼️ Media Library", module: "services" },
      { href: "/admin/faqs", label: "❓ FAQs", module: "faqs" },
      { href: "/admin/reviews", label: "⭐ Reviews", module: "reviews" },
    ],
  },
  {
    label: "Patients",
    items: [
      { href: "/admin/appointments", label: "🗓️ Appointments", module: "bookings" },
      { href: "/admin/bookings", label: "📋 Booking Leads", module: "bookings" },
      { href: "/admin/leads", label: "🎯 Lead Export", module: "leads" },
      { href: "/admin/doctor-availability", label: "🚫 Dr. Availability", module: "bookings" },
      { href: "/admin/booking-success", label: "🎉 Booking Success Page", module: "booking-success" },
      // Moved from "Marketing & AI" (architecture review, Aug 2026) — these
      // are patient-facing clinical intake/assessment tools, not marketing.
      { href: "/admin/assessment-manager", label: "🩺 AI Assessment Manager", module: "ai-assessment" },
      { href: "/admin/ai-assessment", label: "✨ Clinical Intake (Legacy)", module: "ai-assessment" },
      { href: "/admin/journey", label: "🧭 AI Beauty Journey", module: "journey" },
    ],
  },
  {
    // Replaces "Marketing & AI" (architecture review, Aug 2026) — the old
    // single "AI Intelligence" page mixed facts (Business/Marketing
    // Intelligence) with actual AI-generated insight under one label; now
    // three pages, split by what kind of thing they answer ("what
    // happened" vs "why / what next"). SEO kept here for now (config
    // adjacent to Marketing Intelligence's analytics) rather than merged
    // into it — that merge is a deliberate follow-up, not done in this pass.
    label: "Intelligence",
    items: [
      { href: "/admin/business-intelligence", label: "🏢 Business Intelligence", module: "intelligence" },
      { href: "/admin/marketing-intelligence", label: "📱 Marketing Intelligence", module: "intelligence" },
      { href: "/admin/ai-intelligence", label: "🧠 AI Intelligence", module: "intelligence" },
      { href: "/admin/analytics", label: "📈 Analytics Events", module: "analytics" },
      { href: "/admin/seo", label: "🔍 SEO", module: "seo" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/team", label: "👥 Team", module: "team" },
      { href: "/admin/legal", label: "📜 Legal Pages", module: "legal" },
      { href: "/admin/settings", label: "⚙ Settings", module: "settings" },
      { href: "/admin/integrations/crm", label: "🔌 CRM Sync", module: "integrations" },
      { href: "/admin/lead-sources", label: "📡 Lead Sources & Branches", module: "integrations" },
      // Moved from "Marketing & AI" — platform/chatbot config, not analytics.
      { href: "/admin/ai", label: "🤖 AI Management", module: "ai" },
    ],
  },
];

const COLLAPSE_STORAGE_KEY = "admin-sidebar-collapsed-groups";

function findActiveGroupLabel(path: string): string | undefined {
  return NAV_GROUPS.find((g) => g.items.some((i) => (i.exact ? path === i.href : path.startsWith(i.href))))?.label ?? undefined;
}

// Every labeled group starts collapsed except the one containing the
// current page — an all-expanded default would just reproduce the
// original wall-of-links problem this redesign fixes. Deliberately reads
// ONLY `path` (available identically during SSR and the client's first
// render) so the server-rendered HTML and the client's initial render
// always agree — the admin's remembered expand/collapse choices are
// layered in afterward, from a useEffect (see below), since reading
// localStorage during render would disagree with the server (which has
// no localStorage) and trigger a hydration mismatch.
function getDefaultCollapsed(path: string): Record<string, boolean> {
  const base: Record<string, boolean> = Object.fromEntries(NAV_GROUPS.filter((g) => g.label).map((g) => [g.label as string, true]));
  const activeLabel = findActiveGroupLabel(path);
  if (activeLabel) base[activeLabel] = false;
  return base;
}

export default function AdminSidebar({ user }: { user: AdminUserPublic }) {
  const path = usePathname();
  const router = useRouter();
  const role = user.role as AdminRole;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => getDefaultCollapsed(path));

  useEffect(() => {
    fetch("/api/admin/nav-counts")
      .then((r) => r.json())
      .then((d) => setCounts(d))
      .catch(() => {});
  }, []);

  // Runs once, after mount — layers the admin's remembered expand/collapse
  // choices on top of the deterministic SSR-safe default above. A normal
  // post-mount state update, not a hydration mismatch, since it never
  // affects what was actually rendered on the server.
  useEffect(() => {
    let stored: Record<string, boolean> | null = null;
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      // ignore malformed storage
    }
    if (!stored) return;
    const activeLabel = findActiveGroupLabel(path);
    setCollapsed({ ...stored, ...(activeLabel ? { [activeLabel]: false } : {}) });
    // Only on mount — subsequent path changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigating to a page in a different (possibly collapsed) group
  // auto-expands that group, without touching any other group's state.
  useEffect(() => {
    const activeLabel = findActiveGroupLabel(path);
    if (!activeLabel) return;
    setCollapsed((prev) => (prev[activeLabel] === false ? prev : { ...prev, [activeLabel]: false }));
  }, [path]);

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

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
            ? "bg-white text-gray-900 font-semibold border-[#F5A623]"
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
        {visibleGroups.map((g, gi) => {
          const isCollapsed = g.label ? !!collapsed[g.label] : false;
          return (
            <div key={g.label ?? "top"} className={gi > 0 ? "pt-3" : ""}>
              {g.label ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(g.label!)}
                  className="w-full flex items-center justify-between px-3 mb-1 py-1 text-[10px] font-bold uppercase tracking-widest text-white/35 hover:text-white/60 transition"
                >
                  <span>{g.label}</span>
                  <ChevronDown size={12} className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>
              ) : null}
              {!isCollapsed && <div className="space-y-1">{g.items.map(item)}</div>}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4 space-y-2">
        <ThemeSwitcher />
        <Link
          href="/admin/profile"
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
            path === "/admin/profile" ? "bg-white text-gray-900 font-semibold" : "hover:bg-white/10"
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
