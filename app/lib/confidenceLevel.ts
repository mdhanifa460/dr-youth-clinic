// Confidence is still tracked numerically internally (used by
// scoreRecommendations' ranking and Settings.confidenceThreshold), but the
// Clinical Intelligence Engine never shows that number to a doctor or
// patient — this is the single place the High/Medium/Low display value is
// derived from it, so every caller stays consistent with the same
// thresholds. Kept dependency-free so both quizDefaults.ts (seed data) and
// quizMigration.ts (read-time backfill) can import it without a circular
// import between the two.
export function deriveConfidenceLevel(confidence: number): "High" | "Medium" | "Low" {
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}
