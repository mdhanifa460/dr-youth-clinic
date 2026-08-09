// Shared recommendation scoring — client-safe (no mongoose), used by the
// public assessment page. Replaces the old "look up treatments by the
// literal `concern` answer only" logic: every answer across every question
// can carry tags/weight, so any question (not just the concern one) can
// influence which concern — and therefore which treatments — surface.
import type { AssessmentQuestion, TreatmentMapEntry, TreatmentRecommendation } from "./quizDefaults";
import { DEFAULT_SEVERITY_THRESHOLDS } from "./assessmentTypeDefaults";
import type { AssessmentResult } from "./assessmentTypeScoring";

export type AssessmentAnswers = Record<string, string | string[] | number>;

function tagWeightsFrom(questions: AssessmentQuestion[], answers: AssessmentAnswers): Record<string, number> {
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
  return tagWeights;
}

// The percentage-based, no-treatment-reveal result for Plan My Journey —
// same output shape as the newer assessmentTypeScoring.ts (so it can feed
// straight into the same <AssessmentResults> component skin-quiz uses),
// but computed from QuizConfig's EXISTING tag-weight content: no new admin
// config, no re-authoring of PMJ's questions/treatments. A category's "max
// weight" is auto-derived (the highest-weight answer, per question, that
// carries that tag) rather than admin-set, since QuizConfig never had a
// per-category maxWeight field to begin with.
export function scoreJourneyConcern(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswers,
  treatmentMap: TreatmentMapEntry[]
): AssessmentResult {
  const tagWeights = tagWeightsFrom(questions, answers);

  const maxWeightByTag: Record<string, number> = {};
  for (const q of questions) {
    const bestByTag: Record<string, number> = {};
    for (const ans of q.answers) {
      for (const tag of ans.tags) {
        bestByTag[tag] = Math.max(bestByTag[tag] || 0, ans.weight || 0);
      }
    }
    for (const [tag, w] of Object.entries(bestByTag)) {
      maxWeightByTag[tag] = (maxWeightByTag[tag] || 0) + w;
    }
  }

  const categoryScores = treatmentMap
    .filter((entry) => (tagWeights[entry.concernTag] || 0) > 0)
    .map((entry) => {
      const max = maxWeightByTag[entry.concernTag] || 0;
      const percent = max > 0 ? Math.round(Math.max(0, Math.min(100, (tagWeights[entry.concernTag] / max) * 100))) : 0;
      return { key: entry.concernTag, label: entry.concernLabel, percent };
    })
    .sort((a, b) => b.percent - a.percent);

  const overallConcern = categoryScores[0]?.percent ?? 0;
  const severity = DEFAULT_SEVERITY_THRESHOLDS.find((b) => overallConcern >= b.min && overallConcern <= b.max)?.label
    || DEFAULT_SEVERITY_THRESHOLDS[DEFAULT_SEVERITY_THRESHOLDS.length - 1]?.label
    || "";

  // Contributing factors used to be sourced from each matched treatment's
  // possibleCauses — removed along with Treatment Mapping (business
  // decision: doctors work from concern%/severity/raw answers, not a
  // system-suggested treatment list; see architecture note on
  // scoreJourneyConcern above). No concern-level replacement source exists
  // in QuizConfig, so this stays empty rather than reintroducing a
  // treatment-keyed one. AssessmentResults/UnifiedJourneyResults already
  // skip this section entirely when the array is empty.
  const contributingFactors: AssessmentResult["contributingFactors"] = [];

  // No per-answer riskWeight data exists in QuizConfig — riskScore/riskLevel
  // stay at their zero-value defaults; <AssessmentResults> only renders the
  // Risk ring when riskLevel is non-empty, so this cleanly omits it rather
  // than showing a fabricated "0% risk".
  return { categoryScores, overallConcern, severity, riskScore: 0, riskLevel: "", contributingFactors };
}

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
