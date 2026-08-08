// Pre-Consultation Assessment — deterministic scoring engine (architecture
// review §08). Same tag-weight accumulation approach as the legacy
// assessmentScoring.ts (kept separate, untouched — Plan My Journey still
// uses it), reframed to output concern %, risk %, severity, and
// contributing factors instead of ranked treatments. No AI, no network
// calls — pure functions, fully deterministic from admin-configured
// weights and thresholds.
import type { NewAssessmentQuestion, AssessmentTypeConfig, SeverityBand, ScoringCategory } from "./assessmentTypeDefaults";
import type { AssessmentAnswers } from "./assessmentScoring";

export interface CategoryScore {
  key: string;
  label: string;
  percent: number; // 0-100, rounded
}

export interface ContributingFactor {
  tag: string;
  label: string;
  detail: string;
}

export interface AssessmentResult {
  categoryScores: CategoryScore[];
  overallConcern: number; // 0-100
  severity: string;
  riskScore: number; // 0-100
  riskLevel: string;
  contributingFactors: ContributingFactor[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lookupBand(value: number, bands: SeverityBand[]): string {
  const match = bands.find((b) => value >= b.min && value <= b.max);
  return match?.label || bands[bands.length - 1]?.label || "";
}

// Two independent accumulations from the SAME answer set — concern weight
// (answer.weight, only tags matching a configured category) and risk weight
// (answer.riskWeight, only tags in riskFactorTags). One answer can
// contribute to both simultaneously (e.g. "family history: yes" carries a
// risk tag with riskWeight, but no category tag/weight of its own).
function accumulateWeights(
  questions: NewAssessmentQuestion[],
  answers: AssessmentAnswers,
  weightField: "weight" | "riskWeight"
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const question of questions) {
    const given = answers[question.id];
    if (given === undefined || given === null || given === "") continue;
    const chosenIds = Array.isArray(given) ? given : [String(given)];
    for (const answerId of chosenIds) {
      const answer = question.answers.find((a) => a.id === answerId);
      if (!answer) continue;
      for (const tag of answer.tags) {
        totals[tag] = (totals[tag] || 0) + (answer[weightField] || 0);
      }
    }
  }
  return totals;
}

export function scoreAssessment(config: AssessmentTypeConfig, answers: AssessmentAnswers): AssessmentResult {
  const concernWeights = accumulateWeights(config.questions, answers, "weight");
  const riskWeights = accumulateWeights(config.questions, answers, "riskWeight");

  // Category percentages — achieved weight / that category's configured
  // maxWeight, clamped to 0-100. See architecture review §08 FIG. 4.
  const categoryScores: CategoryScore[] = [...config.categories]
    .sort((a, b) => a.order - b.order)
    .map((cat: ScoringCategory) => ({
      key: cat.key,
      label: cat.label,
      percent: cat.maxWeight > 0 ? Math.round(clamp((concernWeights[cat.key] || 0) / cat.maxWeight * 100, 0, 100)) : 0,
    }));

  // Overall = importance-weighted average across categories.
  const importanceSum = config.categories.reduce((sum, c) => sum + (c.importance || 1), 0) || 1;
  const overallConcern = Math.round(
    config.categories.reduce((sum, cat, i) => sum + categoryScores[i].percent * (cat.importance || 1), 0) / importanceSum
  );
  const severity = lookupBand(overallConcern, config.severityThresholds);

  // Risk — single overall score, not broken into categories (matches the
  // brief: "Risk Level beside Concern Level," one number, not several bars).
  const riskWeightTotal = config.riskFactorTags.reduce((sum, tag) => sum + (riskWeights[tag] || 0), 0);
  const riskScore = config.riskMaxWeight > 0 ? Math.round(clamp(riskWeightTotal / config.riskMaxWeight * 100, 0, 100)) : 0;
  const riskLevel = lookupBand(riskScore, config.riskThresholds);

  // Contributing factors — any configured rule whose tag was actually
  // collected from either accumulation, in rule-declaration order. Never a
  // treatment name — see architecture review, throughout.
  const collectedTags = new Set([...Object.keys(concernWeights), ...Object.keys(riskWeights)]);
  const contributingFactors: ContributingFactor[] = config.contributingFactorRules
    .filter((rule) => collectedTags.has(rule.tag) && (concernWeights[rule.tag] > 0 || riskWeights[rule.tag] > 0))
    .map((rule) => ({ tag: rule.tag, label: rule.label, detail: rule.detail }));

  return { categoryScores, overallConcern, severity, riskScore, riskLevel, contributingFactors };
}
