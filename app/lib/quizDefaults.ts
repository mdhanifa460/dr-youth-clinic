// Shared quiz defaults — imported by both model (server) and client components.
// No mongoose imports here so it's safe to use in client bundles.

export const DEFAULT_QUIZ_CONFIG = {
  stepMeta: [
    { step: 1, title: "What's your main concern?",        subtitle: "Select the skin or hair issue that matters most to you right now" },
    { step: 2, title: "What's your skin type?",           subtitle: "This helps us choose the safest, most effective treatments for you" },
    { step: 3, title: "Your treatment experience?",       subtitle: "So we can recommend the right level of treatment" },
    { step: 4, title: "What's your budget per session?",  subtitle: "We have excellent options at every price point" },
    { step: 5, title: "When do you want to start?",       subtitle: "We'll tailor the urgency of our recommendations accordingly" },
  ],
  concerns: [
    { id: "Acne & Breakouts",           emoji: "🔴", label: "Acne & Breakouts",           desc: "" },
    { id: "Pigmentation & Dark Spots",  emoji: "🟫", label: "Pigmentation & Dark Spots",  desc: "" },
    { id: "Ageing & Fine Lines",        emoji: "⏳", label: "Ageing & Fine Lines",        desc: "" },
    { id: "Hair Loss & Thinning",       emoji: "💇", label: "Hair Loss & Thinning",       desc: "" },
    { id: "Unwanted Hair Removal",      emoji: "✨", label: "Unwanted Hair Removal",      desc: "" },
    { id: "General Glow & Refresh",     emoji: "🌟", label: "General Glow & Refresh",     desc: "" },
  ],
  skinTypes: [
    { id: "Oily",        emoji: "💧", label: "Oily",        desc: "Shiny, large pores, prone to acne" },
    { id: "Dry",         emoji: "🌵", label: "Dry",         desc: "Tight, flaky, dull" },
    { id: "Combination", emoji: "🌊", label: "Combination", desc: "Oily T-zone, dry cheeks" },
    { id: "Sensitive",   emoji: "🌹", label: "Sensitive",   desc: "Redness, reacts easily" },
    { id: "Normal",      emoji: "✅", label: "Normal",      desc: "Balanced, few issues" },
  ],
  experiences: [
    { id: "First timer",      emoji: "🌱", label: "First timer",      desc: "Never had professional treatment" },
    { id: "Some experience",  emoji: "🌿", label: "Some experience",  desc: "Had basic facials or peels" },
    { id: "Experienced",      emoji: "🌳", label: "Experienced",      desc: "Done PRP, laser, or advanced treatments" },
  ],
  budgets: [
    "Under ₹5,000 per session",
    "₹5,000 – ₹15,000 per session",
    "₹15,000+ (premium treatments)",
    "Open to packages",
  ],
  timelines: [
    { id: "ASAP",         emoji: "⚡", label: "ASAP",         desc: "I want to start this week" },
    { id: "This month",   emoji: "📅", label: "This month",   desc: "Planning within 30 days" },
    { id: "Exploring",    emoji: "🔍", label: "Exploring",    desc: "Just researching options" },
  ],
  treatmentMap: [
    {
      concernId: "Acne & Breakouts",
      treatments: [
        { name: "Chemical Peel",        icon: "⚗️", desc: "Removes dead skin, unclogs pores, reduces active acne and post-acne marks",                  sessions: "4–6 sessions, every 3 weeks",  price: "₹3,000 – ₹8,000/session",   match: 96 },
        { name: "Hydra Facial",         icon: "💧", desc: "Deep cleanse + extraction + hydration. Immediate glow, zero downtime",                        sessions: "Monthly maintenance",          price: "₹5,000 – ₹12,000",          match: 88 },
        { name: "Laser Acne Treatment", icon: "⚡", desc: "Kills acne-causing bacteria and reduces oil production at the source",                         sessions: "6–8 sessions",                 price: "₹8,000 – ₹18,000/session",  match: 82 },
      ],
    },
    {
      concernId: "Pigmentation & Dark Spots",
      treatments: [
        { name: "Q-Switch Laser",     icon: "🎯", desc: "Targets melanin clusters to break up pigmentation without damaging surrounding skin", sessions: "4–8 sessions", price: "₹6,000 – ₹15,000/session", match: 95 },
        { name: "Chemical Peel",      icon: "⚗️", desc: "Accelerates cell turnover to fade dark spots and even skin tone",                    sessions: "4–6 sessions", price: "₹3,000 – ₹8,000/session",  match: 87 },
        { name: "Vitamin C Infusion", icon: "🍋", desc: "Medical-grade brightening treatment that inhibits melanin production",                sessions: "6 sessions",   price: "₹4,000 – ₹9,000/session",  match: 80 },
      ],
    },
    {
      concernId: "Ageing & Fine Lines",
      treatments: [
        { name: "Anti-Ageing Facial",   icon: "✨", desc: "Collagen-boosting treatment with peptides and growth factors for firmer, plumper skin", sessions: "6–8 sessions",          price: "₹8,000 – ₹20,000/session", match: 94 },
        { name: "Botox / Fillers",      icon: "💉", desc: "Smooths expression lines and restores volume for a refreshed, natural look",             sessions: "Once every 4–6 months", price: "₹15,000 – ₹40,000",        match: 89 },
        { name: "HIFU Skin Tightening", icon: "🔊", desc: "Non-surgical facelift using high-intensity ultrasound energy to lift and tighten",       sessions: "1–2 sessions/year",     price: "₹25,000 – ₹60,000",        match: 83 },
      ],
    },
    {
      concernId: "Hair Loss & Thinning",
      treatments: [
        { name: "PRP Hair Treatment",   icon: "🩸", desc: "Your own platelet-rich plasma injected into the scalp to stimulate dormant follicles", sessions: "6–8 sessions, monthly", price: "₹8,000 – ₹15,000/session",  match: 96 },
        { name: "GFC Hair Treatment",   icon: "🧬", desc: "Next-generation Growth Factor Concentrate — 3x more potent than standard PRP",          sessions: "4–6 sessions",          price: "₹12,000 – ₹20,000/session", match: 91 },
        { name: "Mesotherapy for Hair", icon: "💊", desc: "Micro-injections of vitamins and minerals directly into the scalp for maximum absorption", sessions: "8–10 sessions",       price: "₹5,000 – ₹10,000/session",  match: 83 },
      ],
    },
    {
      concernId: "Unwanted Hair Removal",
      treatments: [
        { name: "Laser Hair Removal",      icon: "⚡", desc: "Permanent reduction of unwanted hair. Safe for all skin tones with our diode laser", sessions: "6–8 sessions per area", price: "₹2,000 – ₹15,000/area",     match: 98 },
        { name: "Full Body Laser Package", icon: "🌟", desc: "Complete hair-free solution for face + arms + legs + underarms + bikini",            sessions: "8 sessions",            price: "₹45,000 – ₹80,000 package", match: 90 },
        { name: "IPL Hair Reduction",      icon: "💡", desc: "Intense Pulsed Light for lighter hair colours. Gentler than laser",                  sessions: "8–10 sessions",         price: "₹3,000 – ₹12,000/area",     match: 78 },
      ],
    },
    {
      concernId: "General Glow & Refresh",
      treatments: [
        { name: "Hydra Facial",          icon: "💧", desc: "Cleanse + exfoliate + extract + hydrate + protect. Instant glow, zero downtime",                 sessions: "Monthly",       price: "₹5,000 – ₹12,000",        match: 97 },
        { name: "Skin Brightening Peel", icon: "🍑", desc: "Medical-grade fruit acid peel that reveals fresher, brighter skin underneath",                   sessions: "4–6 sessions",  price: "₹3,500 – ₹8,000/session", match: 89 },
        { name: "IV Glow Drip",          icon: "✨", desc: "Glutathione + Vitamin C intravenous infusion for full-body skin brightening and radiance",        sessions: "8–12 sessions", price: "₹4,000 – ₹8,000/session", match: 82 },
      ],
    },
  ],
} as const;

export type QuizConfigData = {
  stepMeta:     { step: number; title: string; subtitle: string }[];
  concerns:     { id: string; emoji: string; label: string; desc: string }[];
  skinTypes:    { id: string; emoji: string; label: string; desc: string }[];
  experiences:  { id: string; emoji: string; label: string; desc: string }[];
  budgets:      string[];
  timelines:    { id: string; emoji: string; label: string; desc: string }[];
  treatmentMap: { concernId: string; treatments: { name: string; icon: string; desc: string; sessions: string; price: string; match: number }[] }[];
};
