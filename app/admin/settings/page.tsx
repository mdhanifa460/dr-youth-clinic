"use client";

import Link from "next/link";
import { ArrowRight, FileSliders, CalendarCog, Tag, Monitor, ExternalLink, Megaphone } from "lucide-react";

const SECTIONS = [
  {
    href: "/admin/settings/service-form",
    icon: FileSliders,
    color: "bg-blue-50 text-blue-600",
    border: "border-blue-100 hover:border-blue-300",
    title: "Service Form",
    desc: "Control which fields appear when creating or editing a service — toggle narrative, benefits, media, SEO, and set default values like status and duration.",
    tags: ["Field visibility", "Defaults", "SEO section"],
    stub: false,
  },
  {
    href: "/admin/settings/booking",
    icon: CalendarCog,
    color: "bg-violet-50 text-violet-600",
    border: "border-violet-100 hover:border-violet-300",
    title: "Booking & Notifications",
    desc: "Choose which fields patients fill when booking, set consultation duration, configure WhatsApp notifications, and manage the clinic phone number.",
    tags: ["Patient fields", "WhatsApp", "Duration"],
    stub: false,
  },
  {
    href: "/admin/settings/categories",
    icon: Tag,
    color: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-100 hover:border-emerald-300",
    title: "Service Categories",
    desc: "Customise category labels, icons, gradient colors, and descriptions shown on the public services page.",
    tags: ["Labels", "Icons", "Gradients"],
    stub: false,
  },
  {
    href: "/admin/settings/display",
    icon: Monitor,
    color: "bg-amber-50 text-amber-600",
    border: "border-amber-100 hover:border-amber-300",
    title: "Public Display",
    desc: "Control what visitors see on service cards — toggle price visibility, duration badges, before/after gallery, and the number of related services shown.",
    tags: ["Cards", "Before/After", "Related"],
    stub: false,
  },
  {
    href: "/admin/settings/ads",
    icon: Megaphone,
    color: "bg-rose-50 text-rose-600",
    border: "border-rose-100 hover:border-rose-300",
    title: "Google Ads",
    desc: "Configure Google AdSense — set your Publisher ID, manage individual ad slot positions, toggle test mode, and enable or disable ads globally.",
    tags: ["AdSense", "Ad slots", "Test mode"],
    stub: false,
  },
];

// Existing pages — link out, not settings sub-pages
const QUICK_LINKS = [
  { href: "/admin/homepage", label: "Doctors & Team", note: "Managed in Homepage CMS → Doctors section" },
  { href: "/admin/locations", label: "Clinic Locations", note: "Addresses, hours, phone numbers" },
  { href: "/admin/seo", label: "SEO Defaults", note: "Page-level meta titles & descriptions" },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#0B2560]">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure your clinic — form fields, booking flow, display options, and more.
          </p>
        </div>

        {/* Main settings sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.href} href={s.href} className="block group">
                <div className={`bg-white rounded-2xl border p-6 transition-all duration-200 ${s.border} hover:shadow-md hover:-translate-y-0.5`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
                    <Icon size={20} />
                  </div>
                  <h2 className="font-bold text-[#0B2560] text-base mb-1.5 group-hover:text-blue-700 transition-colors">
                    {s.title}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.desc}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {s.tags.map((t) => (
                        <span key={t} className="text-[10px] font-semibold bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                    <ArrowRight size={15} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick links to existing pages */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Managed elsewhere</p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {QUICK_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group">
                <div>
                  <p className="font-semibold text-sm text-[#0B2560] group-hover:text-blue-700 transition-colors">{l.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.note}</p>
                </div>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-blue-500 transition shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
