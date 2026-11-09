// Campaign Spotlight: a full-width festival or offer section that sits above the
// banner slider on the homepage and city pages. It is a Banner with templateType
// "spotlight", so it is created, scheduled and targeted from Admin → Banners like
// every other banner, but it is never shown inside the slider itself.
//
// Kept free of React and Mongoose so the model, the admin form, the API routes and
// the public component can all share it.

export const SPOTLIGHT_THEMES = ["diwali", "pongal", "onam", "christmas", "new-year", "eid", "offer"] as const;
export type SpotlightTheme = (typeof SPOTLIGHT_THEMES)[number];

// Icon names the admin can pick for a card. The public component maps each to a
// lucide icon; unknown names fall back to "sparkles".
export const SPOTLIGHT_ICONS = [
  "sparkles", "flower", "moon", "sun", "glass-water", "shield-plus", "droplets", "leaf",
  "heart", "star", "gift", "tag", "percent", "calendar", "stethoscope", "snowflake",
] as const;
export type SpotlightIcon = (typeof SPOTLIGHT_ICONS)[number];

export const SPOTLIGHT_MAX_CARDS = 6;

export interface SpotlightCard {
  label: string;
  icon: SpotlightIcon;
  title: string;
  body: string;
}

export interface SpotlightData {
  theme: SpotlightTheme;
  cards: SpotlightCard[];
  closingLine: string;
  disclaimer: string;
  effects: { fireworks: boolean; sparkles: boolean; sound: boolean };
  soundLabel: string;
  doctorReviewed: boolean;
  reviewedBy: string;
}

// [light, deep, corner tint] for each card, cycled when there are more cards.
type Tone = readonly [string, string, string];

export interface SpotlightThemeDef {
  label: string;
  // Section background: top, middle, bottom of the radial wash.
  bg: readonly [string, string, string];
  // a1 light accent, a2 main accent, a3 deep accent, a4 third aurora colour.
  a1: string;
  a2: string;
  a3: string;
  a4: string;
  emblem: "diya" | SpotlightIcon | "tree" | "party";
  pattern: boolean;
  tones: readonly Tone[];
}

export const SPOTLIGHT_THEME_DEFS: Record<SpotlightTheme, SpotlightThemeDef> = {
  diwali: {
    label: "Diwali (gold)",
    bg: ["#12245A", "#070F26", "#050A1A"],
    a1: "#FFE7B0", a2: "#F5A623", a3: "#E8833A", a4: "rgba(190, 60, 110, 0.16)",
    emblem: "diya",
    pattern: true,
    tones: [
      ["#FFE3A3", "#C9962B", "rgba(255, 200, 90, 0.30)"],
      ["#F3D9B8", "#B07A4A", "rgba(236, 140, 150, 0.30)"],
      ["#FFF1C9", "#D4A53A", "rgba(255, 240, 200, 0.24)"],
      ["#FFD08A", "#D9822B", "rgba(255, 150, 50, 0.32)"],
      ["#F7C9A8", "#B8603A", "rgba(220, 100, 70, 0.32)"],
    ],
  },
  pongal: {
    label: "Pongal (harvest sun)",
    bg: ["#4A230C", "#24100A", "#140805"],
    a1: "#FFE9A8", a2: "#F2B233", a3: "#D9661F", a4: "rgba(90, 170, 80, 0.18)",
    emblem: "sun",
    pattern: true,
    tones: [
      ["#FFE9A8", "#D9A21F", "rgba(255, 200, 70, 0.30)"],
      ["#D8EFB0", "#6E9E3A", "rgba(120, 190, 80, 0.26)"],
      ["#FFD3A1", "#D9661F", "rgba(255, 140, 60, 0.30)"],
    ],
  },
  onam: {
    label: "Onam (pookalam)",
    bg: ["#0F4A33", "#072419", "#04140D"],
    a1: "#FFF1B8", a2: "#F4C430", a3: "#E86A2C", a4: "rgba(220, 60, 90, 0.16)",
    emblem: "flower",
    pattern: true,
    tones: [
      ["#FFF1B8", "#D9A92A", "rgba(255, 210, 80, 0.28)"],
      ["#FFC9A8", "#E86A2C", "rgba(240, 120, 60, 0.28)"],
      ["#F9C2CF", "#C8456A", "rgba(220, 70, 110, 0.26)"],
    ],
  },
  christmas: {
    label: "Christmas (pine and red)",
    bg: ["#14402F", "#08201A", "#04120E"],
    a1: "#FFF4D6", a2: "#E6B655", a3: "#D0454F", a4: "rgba(208, 69, 79, 0.18)",
    emblem: "tree",
    pattern: false,
    tones: [
      ["#FFF4D6", "#C9A24A", "rgba(255, 220, 140, 0.24)"],
      ["#F7C1C4", "#C2343F", "rgba(210, 60, 70, 0.28)"],
      ["#D2EBDD", "#3E8A63", "rgba(90, 170, 120, 0.24)"],
    ],
  },
  "new-year": {
    label: "New Year (midnight violet)",
    bg: ["#22185A", "#0D0A2A", "#07051A"],
    a1: "#F5F0FF", a2: "#C9B6FF", a3: "#F2C14E", a4: "rgba(90, 200, 250, 0.16)",
    emblem: "party",
    pattern: false,
    tones: [
      ["#F5F0FF", "#9B83F0", "rgba(170, 140, 255, 0.28)"],
      ["#FFE8A8", "#E0A92E", "rgba(242, 193, 78, 0.28)"],
      ["#C9EEFF", "#3BA7D9", "rgba(90, 200, 250, 0.24)"],
    ],
  },
  eid: {
    label: "Eid (crescent teal)",
    bg: ["#0E4247", "#06222A", "#03141A"],
    a1: "#F6EBC8", a2: "#D9B45A", a3: "#5FB3A8", a4: "rgba(95, 179, 168, 0.16)",
    emblem: "moon",
    pattern: true,
    tones: [
      ["#F6EBC8", "#C29A3E", "rgba(230, 200, 120, 0.26)"],
      ["#CFEDE8", "#3F9488", "rgba(95, 179, 168, 0.26)"],
      ["#F2DDB8", "#A8783A", "rgba(200, 150, 80, 0.24)"],
    ],
  },
  offer: {
    label: "Offer / campaign (clinic navy)",
    bg: ["#12245A", "#0A163A", "#050A1A"],
    a1: "#FFE7B0", a2: "#F5A623", a3: "#5B8DEF", a4: "rgba(91, 141, 239, 0.18)",
    emblem: "gift",
    pattern: false,
    tones: [
      ["#FFE3A3", "#C9962B", "rgba(255, 200, 90, 0.26)"],
      ["#CFE0FF", "#4F7FE0", "rgba(91, 141, 239, 0.26)"],
      ["#FFF1C9", "#D4A53A", "rgba(255, 240, 200, 0.22)"],
    ],
  },
};

export function getSpotlightTheme(theme: string | undefined): SpotlightThemeDef {
  return SPOTLIGHT_THEME_DEFS[(theme as SpotlightTheme) ?? "diwali"] ?? SPOTLIGHT_THEME_DEFS.diwali;
}

// A spotlight runs between two exact moments (end is exclusive), unlike other
// banners whose end date runs through the whole day. Festivals start at 12 AM India
// time, so admins enter times in IST and they are stored as exact instants.
export function isSpotlightLive(b: { startDate?: string | Date | null; endDate?: string | Date | null }, now: Date = new Date()): boolean {
  if (b.startDate && new Date(b.startDate) > now) return false;
  if (b.endDate && new Date(b.endDate) <= now) return false;
  return true;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// "2027-10-29T00:00" (typed in India time) → ISO instant. Empty → null.
export function istInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ISO instant → "YYYY-MM-DDTHH:mm" in India time, for a datetime-local input.
export function isoToIstInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

// Returns why a spotlight may not go live yet, or null when it can. Cards can carry
// skin or health advice, so they must be confirmed as checked by a doctor first.
export function spotlightPublishError(b: {
  templateType?: string;
  status?: string;
  headline?: string;
  spotlight?: Partial<SpotlightData> | null;
}): string | null {
  if (b.templateType !== "spotlight" || b.status !== "active") return null;
  if (!b.headline?.trim()) return "Add a heading before publishing this spotlight.";
  const cards = b.spotlight?.cards ?? [];
  if (cards.length > SPOTLIGHT_MAX_CARDS) return `A spotlight can have at most ${SPOTLIGHT_MAX_CARDS} cards.`;
  if (cards.length > 0 && !b.spotlight?.doctorReviewed) {
    return "Tick “Card text checked by a doctor” on the Content tab before publishing this spotlight.";
  }
  return null;
}
