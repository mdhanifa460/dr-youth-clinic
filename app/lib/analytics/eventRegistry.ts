// Predefined Event Library — a read-only catalog of every analytics event
// that ALREADY fires in production today, cataloged by reading the actual
// call sites (not invented/illustrative names). This is documentation,
// not a runtime dependency: none of the ~20 call sites below were changed
// to import from this file — they already all flow correctly through
// app/lib/trackConversion.ts's pushDataLayerEvent(), and touching 8+ live
// files feeding real GA4 reports for a cosmetic consolidation was judged
// pure risk for zero admin-facing gain (see the Admin Event Manager plan).
//
// Deliberately NOT admin-editable — no API route writes to this data, no
// admin form renames anything here. That's the whole point: predefined
// events are protected from exactly the "generate_lead" → "lead_created_new"
// accident that would silently break historical reporting.
export interface PredefinedEventDef {
  name: string;
  category: "conversion" | "lead" | "engagement" | "attribution" | "offer" | "ai";
  description: string;
  params: string[];
  sources: string[];
}

export const PREDEFINED_EVENTS: PredefinedEventDef[] = [
  {
    name: "booking_confirmed",
    category: "conversion",
    description: "A booking was successfully created.",
    params: ["booking_id", "service", "location"],
    sources: [
      "app/lib/trackConversion.ts (trackBookingConversion)",
      "app/components/homepage/ConsultationFormBar.tsx",
      "app/(public)/book/Form.tsx",
      "app/components/ai/AiChatWidget.tsx",
    ],
  },
  {
    name: "booking_completed",
    category: "conversion",
    description: "The single source-of-truth booking conversion event for GTM/GA4 — fires alongside booking_confirmed, only for a genuine new booking (never on a manually reopened success-page view, never on an idempotent retry of the same booking).",
    params: ["booking_id", "branch", "location", "source", "source_account", "campaign", "medium"],
    sources: [
      "app/lib/trackConversion.ts (trackBookingConversion)",
      "app/components/homepage/ConsultationFormBar.tsx",
      "app/(public)/book/Form.tsx",
      "app/components/ai/AiChatWidget.tsx",
      "app/components/lp/sections/FormSection.tsx",
      "app/components/lp/sections/HeroSection.tsx",
    ],
  },
  {
    name: "lead_submitted",
    category: "lead",
    description: "A skin-quiz or Plan My Journey lead-capture form was submitted.",
    params: ["source", "goal", "preferred_clinic"],
    sources: [
      "app/(public)/skin-quiz/page.tsx",
      "app/(public)/plan-my-journey/PlanMyJourneyClient.tsx",
    ],
  },
  {
    name: "whatsapp_click",
    category: "engagement",
    description: "Visitor tapped a WhatsApp contact CTA.",
    params: ["source"],
    sources: [
      "app/components/MobileStickyBar.tsx",
      "app/components/lp/StickyCta.tsx",
    ],
  },
  {
    name: "call_click",
    category: "engagement",
    description: "Visitor tapped a phone/call CTA.",
    params: ["source"],
    sources: [
      "app/components/MobileStickyBar.tsx",
      "app/components/lp/StickyCta.tsx",
    ],
  },
  {
    name: "migration_session",
    category: "attribution",
    description: "A visitor arrived via the old-domain redirect, once per session.",
    params: ["migration_source", "migration_from"],
    sources: ["app/components/MigrationSessionTracker.tsx"],
  },
  {
    name: "flash_offer_view",
    category: "offer",
    description: "The Flash Offer Popup was shown.",
    params: ["offer_id", "offer_name", "presentation_mode", "page", "source"],
    sources: ["app/lib/bannerPopupAnalytics.ts", "app/components/banners/HomepageOfferSplash.tsx"],
  },
  {
    name: "flash_offer_close",
    category: "offer",
    description: "The Flash Offer Popup was closed (X, backdrop, ESC, or countdown expiry).",
    params: ["offer_id", "offer_name", "presentation_mode", "page", "source"],
    sources: ["app/lib/bannerPopupAnalytics.ts", "app/components/banners/HomepageOfferSplash.tsx"],
  },
  {
    name: "flash_offer_cta_click",
    category: "offer",
    description: "The primary CTA inside the Flash Offer Popup was clicked.",
    params: ["offer_id", "offer_name", "presentation_mode", "page", "source"],
    sources: ["app/lib/bannerPopupAnalytics.ts", "app/components/banners/HomepageOfferSplash.tsx"],
  },
  {
    name: "ai_chat_opened",
    category: "ai",
    description: "The AI chat widget was opened.",
    params: ["source"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_message_sent",
    category: "ai",
    description: "Visitor sent a message in the AI chat widget.",
    params: ["source"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_availability_checked",
    category: "ai",
    description: "The chat widget checked doctor/slot availability.",
    params: ["source", "location"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_doctor_selected",
    category: "ai",
    description: "Visitor picked a doctor inside the chat flow.",
    params: ["source"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_booking_started",
    category: "ai",
    description: "The inline booking flow was opened inside the chat widget.",
    params: ["source"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_booking_completed",
    category: "ai",
    description: "A booking was completed via the chat widget.",
    params: ["source", "service"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_human_handoff",
    category: "ai",
    description: "The chat escalated to a human (callback request, WhatsApp, or call).",
    params: ["source", "method"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_response_generated",
    category: "ai",
    description: "The AI produced a reply.",
    params: ["source"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
  {
    name: "ai_error",
    category: "ai",
    description: "The chat widget hit a stream or network failure.",
    params: ["source", "reason"],
    sources: ["app/components/ai/AiChatWidget.tsx"],
  },
];

export type PredefinedEventName = (typeof PREDEFINED_EVENTS)[number]["name"];

export const PREDEFINED_EVENT_NAMES: string[] = PREDEFINED_EVENTS.map((e) => e.name);

export function isPredefinedEventName(name: string): boolean {
  return PREDEFINED_EVENT_NAMES.includes(name);
}
