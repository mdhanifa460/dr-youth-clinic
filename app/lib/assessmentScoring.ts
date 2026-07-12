// Shared recommendation scoring — client-safe (no mongoose), used by the
// public assessment page. Replaces the old "look up treatments by the
// literal `concern` answer only" logic: every answer across every question
// can carry tags/weight, so any question (not just the concern one) can
// influence which concern — and therefore which treatments — surface.
import type { AssessmentQuestion, TreatmentMapEntry, TreatmentRecommendation } from "./quizDefaults";

export type AssessmentAnswers = Record<string, string | string[] | number>;

export function scoreRecommendations(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswers,
  treatmentMap: TreatmentMapEntry[],
  opts: { maxRecommendations?: number; confidenceThreshold?: number } = {}
): TreatmentRecommendation[] {
  const maxRecommendations = opts.maxRecommendations ?? 3;
  const confidenceThreshold = opts.confidenceThreshold ?? 0;

  // 1. Gather tag weights from every answered question (slider/number
  // answers have no discrete tags and simply don't contribute here).
  const tagWeights: Record<string, number> = {};
  for (const q of questions) {
    const given = answers[q.id];
    if (given === undefined || given === null || given === "") continue;
    const chosenIds = Array.isArray(given) ? given : [String(given)];
    for (const answerId of chosenIds) {
      const ans = q.answers.find((a) => a.id === answerId);
      if (!ans) continue;
      for (const tag of ans.tags) {
        tagWeights[tag] = (tagWeights[tag] || 0) + (ans.weight || 0);
      }
    }
  }

  // 2. Rank concern tags by total collected weight, highest first — this is
  // what lets more than one question steer which concern's treatments win.
  const rankedTags = Object.entries(tagWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  // 3. Walk ranked tags in order, collecting eligible treatments — sorted by
  // confidence WITHIN each concern group, never re-sorted across groups, so
  // a lower-relevance concern's treatment can never outrank the primary one.
  const seen = new Set<string>();
  const candidates: TreatmentRecommendation[] = [];
  for (const tag of rankedTags) {
    const entry = treatmentMap.find((e) => e.concernTag === tag);
    if (!entry) continue;
    const eligible = entry.treatments
      .filter((t) => !seen.has(t.id))
      .filter((t) => t.confidence >= confidenceThreshold)
      .filter((t) => !t.requiredTags?.length || t.requiredTags.some((rt) => (tagWeights[rt] || 0) > 0))
      .sort((a, b) => b.confidence - a.confidence);
    for (const t of eligible) {
      seen.add(t.id);
      candidates.push(t);
    }
  }

  return candidates.slice(0, maxRecommendations);
}

/** The single highest-weighted concern tag the visitor's answers point to — used for analytics ("Most Common Concern"). */
export function getPrimaryConcernTag(questions: AssessmentQuestion[], answers: AssessmentAnswers): string {
  const tagWeights: Record<string, number> = {};
  for (const q of questions) {
    const given = answers[q.id];
    if (given === undefined || given === null || given === "") continue;
    const chosenIds = Array.isArray(given) ? given : [String(given)];
    for (const answerId of chosenIds) {
      const ans = q.answers.find((a) => a.id === answerId);
      if (!ans) continue;
      for (const tag of ans.tags) {
        tagWeights[tag] = (tagWeights[tag] || 0) + (ans.weight || 0);
      }
    }
  }
  const ranked = Object.entries(tagWeights).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || "";
}
