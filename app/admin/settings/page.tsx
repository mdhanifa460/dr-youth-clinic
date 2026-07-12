"use client";

import Link from "next/link";
import { ArrowRight, FileSliders, CalendarCog, Tag, Monitor, ExternalLink, Megaphone, Palette, BarChart2, MessageCircle, BookOpen, Gift, ToggleLeft, Phone } from "lucide-react";

const GROUPS = [
  {
    label: "Marketing",
    color: "text-rose-600",
    items: [
      {
        href: "/admin/settings/brand",
        icon: Palette,
        color: "bg-rose-50 text-rose-600",
        border: "border-rose-100 hover:border-rose-300",
        title: "Brand Identity",
        desc: "Set your clinic tagline, brand colour, social media links, and the WhatsApp CTA number shown across the site.",
        tags: ["Tagline", "Social links", "WhatsApp CTA"],
      },
      {
        href: "/admin/settings/analytics",
        icon: BarChart2,
        color: "bg-violet-50 text-violet-600",
        border: "border-violet-100 hover:border-violet-300",
        title: "Analytics & Tracking",
        desc: "Connect GA4, Meta Pixel, Google Tag Manager, Microsoft Clarity, and Hotjar. IDs are injected on every public page automatically.",
        tags: ["GA4", "Meta Pixel", "GTM", "Clarity"],
      },
      {
        href: "/admin/settings/whatsapp",
        icon: MessageCircle,
        color: "bg-green-50 text-green-600",
        border: "border-green-100 hover:border-green-300",
        title: "WhatsApp Templates",
        desc: "Edit message templates for booking confirmation, appointment reminders, post-treatment follow-ups, review requests, and re-engagement.",
        tags: ["Templates", "Follow-up", "Reviews"],
      },
      {
        href: "/admin/settings/ads",
        icon: Megaphone,
        color: "bg-amber-50 text-amber-600",
        border: "border-amber-100 hover:border-amber-300",
        title: "Marketing Stack",
        desc: "Your professional marketing toolkit — Google Ads for paid acquisition, Meta Ads for social campaigns, and how to set up each tool for maximum ROI.",
        tags: ["Google Ads", "Meta Ads", "ROI"],
      },
      {
        href: "/admin/settings/promotions",
        icon: Gift,
        color: "bg-pink-50 text-pink-600",
        border: "border-pink-100 hover:border-pink-300",
        title: "Promotions & Referral",
        desc: "Enable the patient referral programme, set a live promo code with discount percentage, and run birthday campaigns.",
        tags: ["Referral", "Promo code", "Birthday"],
      },
      {
        href: "/admin/settings/free-labels",
        icon: ToggleLeft,
        color: "bg-teal-50 text-teal-600",
        border: "border-teal-100 hover:border-teal-300",
        title: "Free Label Controls",
        desc: "Toggle whether CTAs say \"Free Consultation\" or \"Consultation\" and \"Free AI Assessment\" or \"AI Assessment\" — one switch, all pages site-wide.",
        tags: ["Free CTA", "Consultation", "AI Assessment"],
      },
    ],
  },
  {
    label: "Content",
    color: "text-blue-600",
    items: [
      {
        href: "/admin/settings/content",
        icon: BookOpen,
        color: "bg-blue-50 text-blue-600",
        border: "border-blue-100 hover:border-blue-300",
        title: "Content & Blog",
        desc: "Control blog pagination, default author, before/after watermark text, testimonial rating filter, carousel speed, and schema markup type.",
        tags: ["Blog", "Before/After", "Schema"],
      },
    ],
  },
  {
    label: "Operations",
    color: "text-gray-500",
    items: [
      {
        href: "/admin/settings/contact",
        icon: Phone,
        color: "bg-sky-50 text-sky-600",
        border: "border-sky-100 hover:border-sky-300",
        title: "Contact & Privacy",
        desc: "Set the public phone, WhatsApp, and email shown across the site. Control which admin roles can view unmasked patient phone numbers.",
        tags: ["Public phone", "WhatsApp", "Phone masking"],
      },
      {
        href: "/admin/settings/booking",
        icon: CalendarCog,
        color: "bg-violet-50 text-violet-600",
        border: "border-violet-100 hover:border-violet-300",
        title: "Booking & Notifications",
        desc: "Choose which fields patients fill when booking, set consultation duration, configure WhatsApp notifications.",
        tags: ["Patient fields", "WhatsApp", "Duration"],
      },
      {
        href: "/admin/settings/service-form",
        icon: FileSliders,
        color: "bg-blue-50 text-blue-600",
        border: "border-blue-100 hover:border-blue-300",
        title: "Service Form",
        desc: "Control which fields appear when creating or editing a service — toggle narrative, benefits, media, SEO, and set default values.",
        tags: ["Field visibility", "Defaults", "SEO"],
      },
      {
        href: "/admin/settings/categories",
        icon: Tag,
        color: "bg-emerald-50 text-emerald-600",
        border: "border-emerald-100 hover:border-emerald-300",
        title: "Service Categories",
        desc: "Customise category labels, icons, gradient colors, and descriptions shown on the public services page.",
        tags: ["Labels", "Icons", "Gradients"],
      },
      {
        href: "/admin/settings/display",
        icon: Monitor,
        color: "bg-amber-50 text-amber-600",
        border: "border-amber-100 hover:border-amber-300",
        title: "Public Display",
        desc: "Control what visitors see on service cards — toggle price visibility, duration badges, before/after gallery, and related service count.",
        tags: ["Cards", "Before/After", "Related"],
      },
      {
        href: "/admin/settings/admin-ui",
        icon: BarChart2,
        color: "bg-indigo-50 text-indigo-600",
        border: "border-indigo-100 hover:border-indigo-300",
        title: "Admin Dashboard",
        desc: "Controls for the admin panel itself, not the public site — toggle the persistent Analytics Strip shown to staff.",
        tags: ["Analytics Strip", "Staff-only"],
      },
    ],
  },
];

const QUICK_LINKS = [
  { href: "/admin/homepage", label: "Doctors & Team", note: "Managed in Homepage CMS → Doctors section" },
  { href: "/admin/locations", label: "Clinic Locations", note: "Addresses, hours, phone numbers" },
  { href: "/admin/seo", label: "SEO Defaults", note: "Page-level meta titles & descriptions" },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#0B2560]">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure your clinic — brand, marketing, content, booking flow, and display options.
          </p>
        </div>

        {GROUPS.map((group) => (
          <div key={group.label} className="mb-8">
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${group.color}`}>
              {group.label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.items.map((s) => {
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
          </div>
        ))}

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
