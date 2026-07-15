// One-time-shape migration for QuizConfig documents saved before the generic
// questions[] structure existed (rigid concerns/skinTypes/experiences/
// budgets/timelines fields + a simpler treatmentMap). Production already has
// a saved document in the old shape — without this, every real customization
// a clinic admin made (edited concerns, AI-generated treatments, etc.) would
// silently vanish behind the new schema instead of degrading gracefully.
//
// This is a pure, read-time transform — it does not write to the database.
// The next admin Save persists the new shape naturally.
import { DEFAULT_QUESTIONS, DEFAULT_RESULT_SECTIONS, DEFAULT_ASSESSMENT_SETTINGS, DEFAULT_AI_PROMPT, DEFAULT_QUIZ_CONFIG, type AssessmentConfigData, type AssessmentQuestion, type TreatmentMapEntry } from "./quizDefaults";
import { deriveConfidenceLevel } from "./confidenceLevel";

function isLegacyShape(config: any): boolean {
  return !!config && !Array.isArray(config.questions) && Array.isArray(config.concerns);
}

export function migrateLegacyQuizConfig(config: any): AssessmentConfigData {
  if (!isLegacyShape(config)) return config as AssessmentConfigData;

  const stepMeta: { step: number; title: string; subtitle: string }[] = config.stepMeta || [];
  const findMeta = (step: number) => stepMeta.find((s) => s.step === step);

  const toAnswers = (
    opts: { id: string; emoji?: string; label: string; desc?: string }[] | string[],
    tagFromId: boolean
  ) =>
    (opts as any[]).map((o, i) => {
      const isString = typeof o === "string";
      const id = isString ? `opt-${i}` : (o.id || o.label);
      const title = isString ? o : o.label;
      return {
        id,
        title,
        description: isString ? "" : (o.desc || ""),
        icon: isString ? "" : (o.emoji || ""),
        image: "",
        score: 0,
        tags: tagFromId ? [id] : [],
        weight: tagFromId ? 100 : 0,
        nextQuestionId: "",
      };
    });

  // Old shape's budget/timeline questions have no equivalent in the current
  // default seed (dropped — they read as sales-funnel questions, not
  // clinical intake); migrated as universal (conditionTags: []) so any real
  // admin customization of them still surfaces rather than silently vanishing.
  const questions: AssessmentQuestion[] = [
    { ...DEFAULT_QUESTIONS[0], title: findMeta(1)?.title || DEFAULT_QUESTIONS[0].title, subtitle: findMeta(1)?.subtitle || DEFAULT_QUESTIONS[0].subtitle, conditionTags: [], answers: toAnswers(config.concerns || [], true) },
    { ...DEFAULT_QUESTIONS[1], title: findMeta(2)?.title || DEFAULT_QUESTIONS[1].title, subtitle: findMeta(2)?.subtitle || DEFAULT_QUESTIONS[1].subtitle, conditionTags: [], answers: toAnswers(config.skinTypes || [], false) },
    { ...DEFAULT_QUESTIONS[2], title: findMeta(3)?.title || DEFAULT_QUESTIONS[2].title, subtitle: findMeta(3)?.subtitle || DEFAULT_QUESTIONS[2].subtitle, conditionTags: [], answers: toAnswers(config.experiences || [], false) },
    { id: "budget", title: findMeta(4)?.title || "What's your budget per session?", subtitle: findMeta(4)?.subtitle || "", description: "", icon: "💰", image: "", type: "single", order: 4, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: [], answers: toAnswers(config.budgets || [], false) },
    { id: "timeline", title: findMeta(5)?.title || "When do you want to start?", subtitle: findMeta(5)?.subtitle || "", description: "", icon: "📅", image: "", type: "single", order: 5, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: [], answers: toAnswers(config.timelines || [], false) },
  ];

  // Old treatmentMap keyed treatments by the concern's raw id/label string —
  // the migrated concern question above tags its answers with that exact
  // same string, so concernTag continuity is preserved without re-slugging.
  const treatmentMap: TreatmentMapEntry[] = (config.treatmentMap || []).map((entry: any) => ({
    concernTag: entry.concernId,
    concernLabel: entry.concernId,
    treatments: (entry.treatments || []).map((t: any, i: number) => {
      const confidence = typeof t.match === "number" ? t.match : (t.confidence ?? 90);
      return {
        id: `${entry.concernId}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: t.name || "",
        icon: t.icon || "✨",
        description: t.desc || t.description || "",
        confidence,
        priority: i + 1,
        sessions: t.sessions || "",
        duration: t.duration || "",
        recovery: t.recovery || "",
        price: t.price || "",
        advantages: t.advantages || [],
        disadvantages: t.disadvantages || [],
        cta: t.cta || "Book Consultation",
        requiredTags: t.requiredTags || [],
        clinicalIndicators: t.clinicalIndicators || [],
        possibleCauses: t.possibleCauses || [],
        suggestedEvaluation: t.suggestedEvaluation || [],
        contraindications: t.contraindications || [],
        doctorNotes: t.doctorNotes || "",
        patientEducation: t.patientEducation || [],
        confidenceLevel: t.confidenceLevel || deriveConfidenceLevel(confidence),
      };
    }),
  }));

  return {
    questions,
    treatmentMap,
    // The legacy shape never had these fields at all, so falling back to ''
    // here (instead of the real defaults) would silently blank out the
    // Doctor's Message section and drop the AI safety-guardrail prompt for
    // the one document that's actually live in production right now.
    aiPrompt: config.aiPrompt || DEFAULT_AI_PROMPT,
    settings: config.settings || DEFAULT_ASSESSMENT_SETTINGS,
    resultSections: config.resultSections?.length ? config.resultSections : DEFAULT_RESULT_SECTIONS,
    doctorMessage: config.doctorMessage || DEFAULT_QUIZ_CONFIG.doctorMessage,
  };
}

// General-purpose backfill, applied to EVERY config (legacy-shape or
// already-generic) — unlike migrateLegacyQuizConfig, this doesn't gate on
// isLegacyShape(). Fills in confidenceLevel/conditionTags for documents
// saved before the Clinical Intake data model extension, purely read-time
// (no DB write); the next admin Save persists these fields naturally.
export function backfillClinicalFields(config: AssessmentConfigData): AssessmentConfigData {
  return {
    ...config,
    questions: (config.questions || []).map((q) => ({
      ...q,
      conditionTags: Array.isArray((q as any).conditionTags) ? (q as any).conditionTags : [],
    })),
    treatmentMap: (config.treatmentMap || []).map((entry) => ({
      ...entry,
      treatments: (entry.treatments || []).map((t: any) => ({
        ...t,
        clinicalIndicators: t.clinicalIndicators || [],
        possibleCauses: t.possibleCauses || [],
        suggestedEvaluation: t.suggestedEvaluation || [],
        contraindications: t.contraindications || [],
        doctorNotes: t.doctorNotes || "",
        patientEducation: t.patientEducation || [],
        confidenceLevel: t.confidenceLevel || deriveConfidenceLevel(t.confidence ?? 90),
      })),
    })),
  };
}
