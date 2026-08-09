import { connectDB } from "@/app/lib/mongodb";
import { InterestEvent } from "@/app/models/InterestEvent";
import {
  getPersonalizationConfig,
  IPersonalizationConfig,
  EventWeight,
  ConfidenceBand,
} from "@/app/models/PersonalizationConfig";

// Homepage Personalization Engine — Phase 2 scoring. Server-only (imports
// mongoose) — never import this from a client component; use
// app/lib/personalization.ts (the isomorphic event-firing half) there
// instead.

export interface CategoryScore {
  key: string;
  label: string;
  rawScore: number;
  score: number; // 0-100, see PersonalizationConfig.scoreSaturationPoint
  confidenceLabel: string;
  stars: number;
  meetsPrimary: boolean;
  meetsSecondary: boolean;
  eventCount: number;
}

export interface VisitorInterestProfile {
  visitorId: string;
  hasAnyHistory: boolean;
  // Every active category, ranked by score descending.
  scores: CategoryScore[];
  // scores filtered to those clearing secondaryThreshold, capped at
  // config.maxCategories — this is the actual candidate set a homepage
  // section is allowed to personalize against.
  qualifying: CategoryScore[];
  // Top qualifying category, only if it clears primaryThreshold.
  primaryCategory: CategoryScore | null;
  // True once 2+ categories qualify — the spec's "blended homepage" case.
  isBlended: boolean;
}

function decayFactor(ageDays: number, halfLifeDays: number): number {
  if (halfLifeDays <= 0) return 1;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

function weightFor(eventType: string, weights: EventWeight[]): number {
  return weights.find((w) => w.eventType === eventType)?.weight ?? 0;
}

function confidenceFor(score: number, bands: ConfidenceBand[]): { label: string; stars: number } {
  const band = bands.find((b) => score >= b.min && score <= b.max);
  if (band) return { label: band.label, stars: band.stars };
  return { label: "Low Confidence", stars: 1 };
}

function emptyProfile(visitorId: string): VisitorInterestProfile {
  return { visitorId, hasAnyHistory: false, scores: [], qualifying: [], primaryCategory: null, isBlended: false };
}

export async function getVisitorInterestProfile(
  visitorId: string | null | undefined,
  configOverride?: IPersonalizationConfig
): Promise<VisitorInterestProfile> {
  if (!visitorId) return emptyProfile("");

  const config = configOverride ?? (await getPersonalizationConfig());
  const activeCategories = config.categories.filter((c) => c.active);
  if (activeCategories.length === 0) return emptyProfile(visitorId);

  await connectDB();
  const events = await (InterestEvent as any)
    .find({ visitorId })
    .select({ category: 1, eventType: 1, createdAt: 1 })
    .lean();

  if (!events.length) return emptyProfile(visitorId);

  const now = Date.now();
  const rawByCategory = new Map<string, number>();
  const countByCategory = new Map<string, number>();

  for (const ev of events as any[]) {
    const ageDays = (now - new Date(ev.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const weight = weightFor(ev.eventType, config.eventWeights);
    if (weight <= 0) continue;
    const decayed = weight * decayFactor(ageDays, config.decayHalfLifeDays);
    rawByCategory.set(ev.category, (rawByCategory.get(ev.category) || 0) + decayed);
    countByCategory.set(ev.category, (countByCategory.get(ev.category) || 0) + 1);
  }

  const scores: CategoryScore[] = activeCategories
    .map((cat) => {
      const raw = rawByCategory.get(cat.key) || 0;
      const score = Math.round(100 * (1 - Math.exp(-raw / config.scoreSaturationPoint)));
      const { label, stars } = confidenceFor(score, config.confidenceBands);
      return {
        key: cat.key,
        label: cat.label,
        rawScore: Math.round(raw * 100) / 100,
        score,
        confidenceLabel: label,
        stars,
        meetsPrimary: score >= config.primaryThreshold,
        meetsSecondary: score >= config.secondaryThreshold,
        eventCount: countByCategory.get(cat.key) || 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  const qualifying = scores.filter((s) => s.meetsSecondary).slice(0, config.maxCategories);
  const primaryCategory = qualifying.length && qualifying[0].meetsPrimary ? qualifying[0] : null;

  return {
    visitorId,
    hasAnyHistory: rawByCategory.size > 0,
    scores,
    qualifying,
    primaryCategory,
    isBlended: qualifying.length >= 2,
  };
}
