// One-time-shape migration for QuizConfig documents saved before the generic
// questions[] structure existed (rigid concerns/skinTypes/experiences/
// budgets/timelines fields + a simpler treatmentMap). Production already has
// a saved document in the old shape — without this, every real customization
// a clinic admin made (edited concerns, AI-generated treatments, etc.) would
// silently vanish behind the new schema instead of degrading gracefully.
//
// This is a pure, read-time transform — it does not write to the database.
// The next admin Save persists the new shape naturally.
import { DEFAULT_QUESTIONS, DEFAULT_RESULT_SECTIONS, DEFAULT_ASSESSMENT_SETTINGS, type AssessmentConfigData, type AssessmentQuestion, type TreatmentMapEntry } from "./quizDefaults";

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

  const questions: AssessmentQuestion[] = [
    { ...DEFAULT_QUESTIONS[0], title: findMeta(1)?.title || DEFAULT_QUESTIONS[0].title, subtitle: findMeta(1)?.subtitle || DEFAULT_QUESTIONS[0].subtitle, answers: toAnswers(config.concerns || [], true) },
    { ...DEFAULT_QUESTIONS[1], title: findMeta(2)?.title || DEFAULT_QUESTIONS[1].title, subtitle: findMeta(2)?.subtitle || DEFAULT_QUESTIONS[1].subtitle, answers: toAnswers(config.skinTypes || [], false) },
    { ...DEFAULT_QUESTIONS[2], title: findMeta(3)?.title || DEFAULT_QUESTIONS[2].title, subtitle: findMeta(3)?.subtitle || DEFAULT_QUESTIONS[2].subtitle, answers: toAnswers(config.experiences || [], false) },
    { ...DEFAULT_QUESTIONS[3], title: findMeta(4)?.title || DEFAULT_QUESTIONS[3].title, subtitle: findMeta(4)?.subtitle || DEFAULT_QUESTIONS[3].subtitle, answers: toAnswers(config.budgets || [], false) },
    { ...DEFAULT_QUESTIONS[4], title: findMeta(5)?.title || DEFAULT_QUESTIONS[4].title, subtitle: findMeta(5)?.subtitle || DEFAULT_QUESTIONS[4].subtitle, answers: toAnswers(config.timelines || [], false) },
  ];

  // Old treatmentMap keyed treatments by the concern's raw id/label string —
  // the migrated concern question above tags its answers with that exact
  // same string, so concernTag continuity is preserved without re-slugging.
  const treatmentMap: TreatmentMapEntry[] = (config.treatmentMap || []).map((entry: any) => ({
    concernTag: entry.concernId,
    concernLabel: entry.concernId,
    treatments: (entry.treatments || []).map((t: any, i: number) => ({
      id: `${entry.concernId}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: t.name || "",
      icon: t.icon || "✨",
      description: t.desc || t.description || "",
      confidence: typeof t.match === "number" ? t.match : (t.confidence ?? 90),
      priority: i + 1,
      sessions: t.sessions || "",
      duration: t.duration || "",
      recovery: t.recovery || "",
      price: t.price || "",
      advantages: t.advantages || [],
      disadvantages: t.disadvantages || [],
      cta: t.cta || "Book Consultation",
      requiredTags: t.requiredTags || [],
    })),
  }));

  return {
    questions,
    treatmentMap,
    aiPrompt: config.aiPrompt || "",
    settings: config.settings || DEFAULT_ASSESSMENT_SETTINGS,
    resultSections: config.resultSections?.length ? config.resultSections : DEFAULT_RESULT_SECTIONS,
    doctorMessage: config.doctorMessage || "",
  };
}
