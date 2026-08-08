// Pre-Consultation Assessment — types + seed data for the new Hair / Skin /
// Body engine. Deliberately separate from quizDefaults.ts (the legacy
// skin-quiz/Plan My Journey treatment-recommendation engine, which stays
// untouched and keeps running exactly as it does today). Client-safe, no
// mongoose imports.
//
// Core rule this whole file exists to enforce: nothing here ever produces
// or stores a treatment name for patient-facing output. treatmentMap is
// carried per type purely so Doctor Review Mode (unchanged) has clinical
// context to draw on after consultation — see AssessmentTypeConfig.treatmentMap.
import type { AssessmentQuestion, AssessmentAnswer, QuestionType, TreatmentMapEntry } from "./quizDefaults";
import { DEFAULT_TREATMENT_MAP } from "./quizDefaults";

export type AssessmentTypeKey = "hair" | "skin" | "body";

// Additive to the existing AssessmentAnswer shape — riskWeight and
// followUpQuestionIds are the only two new answer-level fields the whole
// redesign needed (see the architecture review, §03A).
export interface NewAssessmentAnswer extends AssessmentAnswer {
  // Separate from `weight` (which drives Concern %) — how much this answer
  // should count toward Risk Level, a distinct dimension (see architecture
  // review §03A "On #2"). 0 = doesn't affect risk.
  riskWeight: number;
  // Adaptive follow-ups (§03A "On #1") — question ids to splice into the
  // ordered flow immediately after this one, only when this specific answer
  // is chosen. Generalizes the existing nextQuestionId branching rather than
  // replacing it.
  followUpQuestionIds: string[];
}

export interface NewAssessmentQuestion extends Omit<AssessmentQuestion, "answers"> {
  answers: NewAssessmentAnswer[];
}

export interface ScoringCategory {
  key: string;         // matches an answer's `tags` entry
  label: string;        // e.g. "Hair Fall Impact" — never "damage"/"severity score"
  maxWeight: number;    // sum of weight this category can realistically accumulate — normalizes to 0-100%
  importance: number;   // relative weight in the overall-concern average, default 1
  order: number;
}

export interface SeverityBand {
  min: number;
  max: number;
  label: string;
}

export interface ContributingFactorRule {
  tag: string;   // matches an answer's `tags` entry (concern or risk tag)
  label: string; // short — "Family history"
  detail: string; // one sentence of plain-language context
}

export interface CtaButton {
  label: string;
  type: "book" | "content" | "chat";
  href?: string; // required when type === "content"
}

export interface CtaRule {
  severity: string; // matches a SeverityBand.label for this type
  headline: string;
  body: string;
  buttons: CtaButton[];
}

export interface AssessmentTypeConfig {
  key: AssessmentTypeKey;
  label: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  order: number;
  active: boolean;
  version: number;
  questions: NewAssessmentQuestion[];
  categories: ScoringCategory[];
  riskFactorTags: string[];
  riskMaxWeight: number;
  severityThresholds: SeverityBand[];
  riskThresholds: SeverityBand[];
  contributingFactorRules: ContributingFactorRule[];
  ctaRules: CtaRule[];
  resultTemplate: { headline: string; disclaimer: string };
  // Doctor-facing only — never returned to the patient-facing API response.
  // Reuses the exact same TreatmentMapEntry shape as the legacy engine.
  treatmentMap: TreatmentMapEntry[];
}

export interface AssessmentManagerConfig {
  assessmentTypes: AssessmentTypeConfig[];
}

// ─── Small answer builders (mirrors quizDefaults.ts conventions) ──────────

function a(id: string, title: string, opts: Partial<NewAssessmentAnswer> = {}): NewAssessmentAnswer {
  return {
    id, title, description: opts.description || "", icon: opts.icon || "", image: opts.image || "",
    score: 0, tags: opts.tags || [], weight: opts.weight ?? 0,
    nextQuestionId: opts.nextQuestionId || "", riskWeight: opts.riskWeight ?? 0,
    followUpQuestionIds: opts.followUpQuestionIds || [],
  };
}

function q(
  id: string, title: string, type: QuestionType, order: number,
  answers: NewAssessmentAnswer[], opts: Partial<NewAssessmentQuestion> = {}
): NewAssessmentQuestion {
  return {
    id, title, subtitle: opts.subtitle || "", description: "", icon: opts.icon || "", image: "",
    type, order, required: opts.required ?? true, answers,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    conditionTags: opts.conditionTags || [],
  };
}

const AGE_GENDER_QUESTIONS = (offset: number): NewAssessmentQuestion[] => [
  q("age", "What's your age?", "number", offset, [], { subtitle: "Helps your doctor tailor their assessment", required: false }),
  q("gender", "What's your gender?", "single", offset + 1, [
    a("male", "Male"), a("female", "Female"), a("prefer-not-to-say", "Prefer not to say"),
  ], { subtitle: "Helps your doctor tailor their assessment", required: false }),
];

const PHOTO_NOTES_QUESTIONS = (offset: number): NewAssessmentQuestion[] => [
  q("photo", "Add a photo", "photo", offset, [], { subtitle: "Optional — helps your doctor prepare for your visit", required: false }),
  q("notes", "Anything else you'd like your doctor to know?", "text", offset + 1, [], { subtitle: "Optional — describe your concern in your own words", required: false }),
];

// ═══════════════════════════════════════════════════════════════════════
// HAIR — built out fully, the first end-to-end proof (architecture review
// §14, "scope for the first pass").
// ═══════════════════════════════════════════════════════════════════════

const HAIR_QUESTIONS: NewAssessmentQuestion[] = [
  ...AGE_GENDER_QUESTIONS(1),
  q("primary-concern", "What's your primary hair concern?", "single", 3, [
    a("hair-fall", "Hair Fall", { description: "Noticeably more shedding than before", icon: "💇", tags: ["hair-fall-impact"], weight: 40 }),
    a("hair-thinning", "Hair Thinning", { description: "Strands feel finer, less full", icon: "🪮", tags: ["density-concern"], weight: 40 }),
    a("receding-hairline", "Receding Hairline", { description: "Hairline moving back or up", icon: "📏", tags: ["hairline-concern"], weight: 40 }),
    a("bald-patches", "Bald Patches", { description: "One or more distinct thin/bare spots", icon: "⭕", tags: ["density-concern", "hairline-concern"], weight: 30 }),
    a("scalp-concern", "Scalp Concern", { description: "Itching, flaking, or scalp irritation", icon: "🧴", tags: ["hair-fall-impact"], weight: 15 }),
    a("other-hair", "Other", { description: "" }),
  ], { subtitle: "Select the one that matters most to you right now" }),
  q("duration", "How long have you noticed this?", "single", 4, [
    a("d-under-3m", "Less than 3 months", { tags: ["hair-fall-impact"], weight: 10, riskWeight: 10, followUpQuestionIds: [] }),
    a("d-3-6m", "3–6 months", { tags: ["hair-fall-impact"], weight: 20, riskWeight: 20 }),
    a("d-6-12m", "6–12 months", { tags: ["hair-fall-impact"], weight: 30, riskWeight: 30 }),
    a("d-over-1y", "More than 1 year", { tags: ["hair-fall-impact", "duration-factor"], weight: 40, riskWeight: 40 }),
  ]),
  q("progression", "How would you describe the progression?", "single", 5, [
    a("stable", "Stable", { description: "Not noticeably changing", tags: ["hair-fall-impact"], weight: 5 }),
    a("slow", "Slowly increasing", { tags: ["hair-fall-impact"], weight: 20, riskWeight: 15 }),
    a("rapid", "Rapidly increasing", { tags: ["hair-fall-impact", "progression-rapid"], weight: 40, riskWeight: 45 }),
    a("not-sure", "Not sure", { tags: ["hair-fall-impact"], weight: 10 }),
  ]),
  // Adaptive follow-up (§03A item 1) — conditionTags is the existing Dynamic
  // Question Engine mechanism (assessmentFlow.ts:getOrderedQuestions),
  // already reused as-is: this question is invisible to everyone until the
  // "progression-rapid" tag has actually been collected, i.e. only visitors
  // who picked "Rapidly increasing" above ever see it. No new engine code
  // needed — the answer-level `followUpQuestionIds` field stays in the
  // schema for a future authoring-UI convenience (auto-deriving this wiring
  // from a picker instead of hand-set conditionTags), unused by this build.
  q("rapid-progression-detail", "Since when has it felt like it's speeding up?", "single", 5.5, [
    a("rp-2w", "In the last 2 weeks", { riskWeight: 20 }),
    a("rp-1m", "In the last month", { riskWeight: 15 }),
    a("rp-3m", "In the last 2–3 months", { riskWeight: 10 }),
  ], { required: false, conditionTags: ["progression-rapid"] }),
  q("family-history", "Any family history of hair loss?", "single", 6, [
    a("fh-yes", "Yes", { description: "Parents, siblings, or grandparents", tags: ["family-history"], riskWeight: 80 }),
    a("fh-no", "No", {}),
    a("fh-not-sure", "Not sure", { riskWeight: 10 }),
  ]),
  q("lifestyle", "Any recent changes in your life?", "multi", 7, [
    a("ls-stress", "Stress", { tags: ["risk-stress"], riskWeight: 30 }),
    a("ls-sleep", "Poor sleep", { tags: ["risk-sleep"], riskWeight: 20 }),
    a("ls-weight", "Major weight change", { tags: ["risk-weight-change"], riskWeight: 25 }),
    a("ls-illness", "Illness", { tags: ["risk-illness"], riskWeight: 30 }),
    a("ls-diet", "Dietary changes", { tags: ["risk-diet"], riskWeight: 15 }),
    a("ls-medication", "Medication changes", { tags: ["risk-medication"], riskWeight: 20 }),
    a("ls-none", "None of these", {}),
  ], { subtitle: "Select all that apply", required: false }),
  q("previous-care", "Previous consultation or treatment?", "single", 8, [
    a("pc-consulted", "Previously consulted a doctor about this"),
    a("pc-none", "No previous consultation"),
    a("pc-treatment", "Had previous treatment for this"),
  ], { required: false }),
  ...PHOTO_NOTES_QUESTIONS(9),
];

const HAIR_CATEGORIES: ScoringCategory[] = [
  { key: "hair-fall-impact", label: "Hair Fall Impact", maxWeight: 120, importance: 1, order: 1 },
  { key: "density-concern", label: "Density Concern", maxWeight: 70, importance: 1, order: 2 },
  { key: "hairline-concern", label: "Hairline Concern", maxWeight: 70, importance: 1, order: 3 },
];

const HAIR_CONTRIBUTING_FACTORS: ContributingFactorRule[] = [
  { tag: "family-history", label: "Family history", detail: "A reported family history of hair loss is a well-known contributing factor." },
  { tag: "risk-stress", label: "Recent stress", detail: "Elevated stress levels can contribute to increased shedding." },
  { tag: "duration-factor", label: "Duration of symptoms", detail: "How long a concern has been present is one factor your doctor will consider." },
  { tag: "progression-rapid", label: "Rapid progression", detail: "A quickly-worsening pattern is something your doctor will want to evaluate directly." },
  { tag: "risk-illness", label: "Recent illness", detail: "Illness, fever, or surgery in recent months can be linked to temporary shedding." },
  { tag: "risk-weight-change", label: "Weight change", detail: "Significant recent weight change can be linked to hair changes." },
  { tag: "risk-sleep", label: "Sleep quality", detail: "Poor sleep is a commonly reported factor alongside hair concerns." },
  { tag: "risk-diet", label: "Dietary changes", detail: "Recent changes in diet can be a relevant factor to discuss." },
  { tag: "risk-medication", label: "Medication changes", detail: "New or changed medication is worth flagging to your doctor." },
];

// ═══════════════════════════════════════════════════════════════════════
// SKIN — a real, working starter set (acne / pigmentation / texture),
// intentionally lighter than Hair per the agreed "Hair first" scope. Fully
// admin-editable and expandable via CMS, not a placeholder.
// ═══════════════════════════════════════════════════════════════════════

const SKIN_QUESTIONS: NewAssessmentQuestion[] = [
  ...AGE_GENDER_QUESTIONS(1),
  q("skin-type", "What's your skin type?", "single", 3, [
    a("oily", "Oily", { description: "Shiny, large pores, prone to breakouts" }),
    a("dry", "Dry", { description: "Tight, flaky, dull" }),
    a("combination", "Combination", { description: "Oily T-zone, dry cheeks" }),
    a("sensitive", "Sensitive", { description: "Redness, reacts easily" }),
    a("normal", "Normal", { description: "Balanced, few issues" }),
  ]),
  q("primary-concern", "What's your primary skin concern?", "single", 4, [
    a("acne-concern", "Acne / Breakouts", { icon: "🔴", tags: ["acne-concern"], weight: 40 }),
    a("pigmentation-concern", "Pigmentation / Dark Spots", { icon: "🟫", tags: ["pigmentation-concern"], weight: 40 }),
    a("texture-concern", "Texture / Fine Lines", { icon: "✨", tags: ["texture-concern"], weight: 40 }),
    a("sensitivity-concern", "Sensitivity / Redness", { icon: "🌹", tags: ["texture-concern"], weight: 25 }),
    a("other-skin", "Other", {}),
  ]),
  q("skin-duration", "How long has this been present?", "single", 5, [
    a("sd-under-3m", "Less than 3 months", { tags: ["acne-concern", "pigmentation-concern", "texture-concern"], weight: 10 }),
    a("sd-3-6m", "3–6 months", { tags: ["acne-concern", "pigmentation-concern", "texture-concern"], weight: 20 }),
    a("sd-6-12m", "6–12 months", { tags: ["acne-concern", "pigmentation-concern", "texture-concern"], weight: 30, riskWeight: 20 }),
    a("sd-over-1y", "More than 1 year", { tags: ["acne-concern", "pigmentation-concern", "texture-concern", "duration-factor"], weight: 40, riskWeight: 35 }),
  ]),
  q("sun-exposure", "How much daily sun exposure do you typically get?", "single", 6, [
    a("sun-minimal", "Minimal (mostly indoors)", {}),
    a("sun-moderate", "Moderate", { tags: ["risk-sun"], riskWeight: 20 }),
    a("sun-high", "High (outdoors most of the day)", { tags: ["risk-sun"], riskWeight: 40 }),
  ], { required: false }),
  q("hormonal-history", "Any known hormonal history relevant to this?", "single", 7, [
    a("hh-yes", "Yes", { description: "e.g. PCOS, thyroid, contraceptive use", tags: ["risk-hormonal"], riskWeight: 40 }),
    a("hh-no", "No", {}),
    a("hh-not-sure", "Not sure", {}),
  ], { required: false }),
  q("skin-previous-care", "Previous consultation or treatment?", "single", 8, [
    a("spc-consulted", "Previously consulted a doctor about this"),
    a("spc-none", "No previous consultation"),
    a("spc-treatment", "Had previous treatment for this"),
  ], { required: false }),
  ...PHOTO_NOTES_QUESTIONS(9),
];

const SKIN_CATEGORIES: ScoringCategory[] = [
  { key: "acne-concern", label: "Acne Concern", maxWeight: 100, importance: 1, order: 1 },
  { key: "pigmentation-concern", label: "Pigmentation Concern", maxWeight: 100, importance: 1, order: 2 },
  { key: "texture-concern", label: "Texture Concern", maxWeight: 100, importance: 1, order: 3 },
];

const SKIN_CONTRIBUTING_FACTORS: ContributingFactorRule[] = [
  { tag: "duration-factor", label: "Duration of symptoms", detail: "How long a concern has been present is one factor your doctor will consider." },
  { tag: "risk-sun", label: "Sun exposure", detail: "Higher regular sun exposure is a commonly reported factor for skin concerns." },
  { tag: "risk-hormonal", label: "Hormonal history", detail: "Hormonal factors are worth flagging for your doctor to review." },
];

// ═══════════════════════════════════════════════════════════════════════
// BODY — weight-management starter set, same treatment as Skin.
// ═══════════════════════════════════════════════════════════════════════

const BODY_QUESTIONS: NewAssessmentQuestion[] = [
  ...AGE_GENDER_QUESTIONS(1),
  q("body-goal-type", "What best describes your goal?", "single", 3, [
    a("targeted-area", "Reduce fat in a specific area", { description: "e.g. belly, thighs, double chin", icon: "🎯", tags: ["body-composition-concern"], weight: 35 }),
    a("full-body", "Overall body composition", { description: "Lose weight all over", icon: "🔥", tags: ["body-composition-concern"], weight: 35 }),
    a("both-goal-types", "Both", { tags: ["body-composition-concern"], weight: 40 }),
  ]),
  q("body-duration", "How long have you been trying to address this?", "single", 4, [
    a("bd-under-3m", "Less than 3 months", { tags: ["body-composition-concern"], weight: 10 }),
    a("bd-3-6m", "3–6 months", { tags: ["body-composition-concern"], weight: 20 }),
    a("bd-6-12m", "6–12 months", { tags: ["body-composition-concern"], weight: 30, riskWeight: 15 }),
    a("bd-over-1y", "More than 1 year", { tags: ["body-composition-concern", "duration-factor"], weight: 40, riskWeight: 30 }),
  ]),
  q("body-medical", "Any of these apply to you?", "multi", 5, [
    a("bm-thyroid", "Thyroid condition", { tags: ["risk-thyroid"], riskWeight: 40 }),
    a("bm-pcos", "PCOS / PCOD", { tags: ["risk-pcos"], riskWeight: 40 }),
    a("bm-diabetes", "Diabetes", { tags: ["risk-diabetes"], riskWeight: 40 }),
    a("bm-none", "None of these", {}),
  ], { subtitle: "Select all that apply — helps your doctor assess safely", required: false }),
  q("body-activity", "How would you describe your current activity level?", "single", 6, [
    a("ba-sedentary", "Sedentary", { description: "Little to no exercise", riskWeight: 15 }),
    a("ba-light", "Lightly active", { description: "1–2 days/week" }),
    a("ba-moderate", "Moderately active", { description: "3–5 days/week" }),
    a("ba-very", "Very active", { description: "6–7 days/week" }),
  ], { required: false }),
  q("body-previous-care", "Previous consultation or treatment?", "single", 7, [
    a("bpc-consulted", "Previously consulted a doctor about this"),
    a("bpc-none", "No previous consultation"),
    a("bpc-treatment", "Had previous treatment for this"),
  ], { required: false }),
  ...PHOTO_NOTES_QUESTIONS(8),
];

const BODY_CATEGORIES: ScoringCategory[] = [
  { key: "body-composition-concern", label: "Body Composition Concern", maxWeight: 110, importance: 1, order: 1 },
];

const BODY_CONTRIBUTING_FACTORS: ContributingFactorRule[] = [
  { tag: "duration-factor", label: "Duration of symptoms", detail: "How long this has been a goal is one factor your doctor will consider." },
  { tag: "risk-thyroid", label: "Thyroid condition", detail: "A reported thyroid condition is relevant context for your doctor." },
  { tag: "risk-pcos", label: "PCOS / PCOD", detail: "A reported PCOS/PCOD diagnosis is relevant context for your doctor." },
  { tag: "risk-diabetes", label: "Diabetes", detail: "A reported diabetes diagnosis is relevant context for your doctor." },
];

// ─── Shared: severity/risk bands + CTA rules (same shape/wording pattern
// across all three types — admin can retune independently per type) ──────

// IMPORTANT — placeholders, not medically validated. Exactly the numbers
// used as an example in the product brief. A qualified medical professional
// on the clinic side must review/approve these (and every category's
// maxWeight above) before this reaches real patients — see the architecture
// review §08's callout and §14's approval item.
const DEFAULT_SEVERITY_THRESHOLDS: SeverityBand[] = [
  { min: 0, max: 30, label: "Mild" },
  { min: 31, max: 60, label: "Moderate" },
  { min: 61, max: 80, label: "Significant" },
  { min: 81, max: 100, label: "High" },
];

const DEFAULT_RISK_THRESHOLDS: SeverityBand[] = [
  { min: 0, max: 30, label: "Low" },
  { min: 31, max: 60, label: "Moderate" },
  { min: 61, max: 80, label: "Elevated" },
  { min: 81, max: 100, label: "High" },
];

function defaultCtaRules(typeLabel: string): CtaRule[] {
  return [
    {
      severity: "Mild",
      headline: "Your assessment indicates a mild level of concern.",
      body: `A specialist consultation is optional at this stage — you're also welcome to explore general ${typeLabel.toLowerCase()} guidance first.`,
      buttons: [
        { label: `Explore ${typeLabel} Guide`, type: "content", href: "/blog" },
        { label: "Talk to a Specialist", type: "book" },
      ],
    },
    {
      severity: "Moderate",
      headline: "Your assessment indicates a moderate level of concern.",
      body: "A specialist consultation can help evaluate your condition and determine the appropriate next steps.",
      buttons: [{ label: "Book Consultation", type: "book" }],
    },
    {
      severity: "Significant",
      headline: "Your assessment indicates a significant level of concern.",
      body: "We recommend consulting a specialist for a detailed evaluation.",
      buttons: [{ label: "Book Consultation", type: "book" }],
    },
    {
      severity: "High",
      headline: "Your assessment indicates a high level of concern.",
      body: "We recommend consulting a specialist as soon as convenient for a detailed evaluation.",
      buttons: [{ label: "Book Consultation", type: "book" }],
    },
  ];
}

function treatmentMapFor(tags: string[]): TreatmentMapEntry[] {
  return DEFAULT_TREATMENT_MAP.filter((e) => tags.includes(e.concernTag));
}

export const DEFAULT_ASSESSMENT_TYPES: AssessmentTypeConfig[] = [
  {
    key: "hair", label: "Hair", icon: "💇", colorFrom: "#C2410C", colorTo: "#EA580C",
    order: 1, active: true, version: 1,
    questions: HAIR_QUESTIONS, categories: HAIR_CATEGORIES,
    riskFactorTags: ["duration-factor", "progression-rapid", "family-history", "risk-stress", "risk-sleep", "risk-weight-change", "risk-illness", "risk-diet", "risk-medication"],
    riskMaxWeight: 200,
    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS, riskThresholds: DEFAULT_RISK_THRESHOLDS,
    contributingFactorRules: HAIR_CONTRIBUTING_FACTORS, ctaRules: defaultCtaRules("Hair Care"),
    resultTemplate: { headline: "Your Hair Assessment", disclaimer: "This assessment provides general guidance and is not a medical diagnosis." },
    treatmentMap: treatmentMapFor(["hair"]),
  },
  {
    key: "skin", label: "Skin", icon: "✨", colorFrom: "#1E293B", colorTo: "#0B2560",
    order: 2, active: true, version: 1,
    questions: SKIN_QUESTIONS, categories: SKIN_CATEGORIES,
    riskFactorTags: ["duration-factor", "risk-sun", "risk-hormonal"],
    riskMaxWeight: 150,
    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS, riskThresholds: DEFAULT_RISK_THRESHOLDS,
    contributingFactorRules: SKIN_CONTRIBUTING_FACTORS, ctaRules: defaultCtaRules("Skin Care"),
    resultTemplate: { headline: "Your Skin Assessment", disclaimer: "This assessment provides general guidance and is not a medical diagnosis." },
    treatmentMap: treatmentMapFor(["acne", "pigmentation", "ageing", "glow"]),
  },
  {
    key: "body", label: "Body", icon: "🔥", colorFrom: "#166534", colorTo: "#15803D",
    order: 3, active: true, version: 1,
    questions: BODY_QUESTIONS, categories: BODY_CATEGORIES,
    riskFactorTags: ["duration-factor", "risk-thyroid", "risk-pcos", "risk-diabetes"],
    riskMaxWeight: 150,
    severityThresholds: DEFAULT_SEVERITY_THRESHOLDS, riskThresholds: DEFAULT_RISK_THRESHOLDS,
    contributingFactorRules: BODY_CONTRIBUTING_FACTORS, ctaRules: defaultCtaRules("Body Care"),
    resultTemplate: { headline: "Your Body Assessment", disclaimer: "This assessment provides general guidance and is not a medical diagnosis." },
    treatmentMap: treatmentMapFor(["weight-loss"]),
  },
];

export const DEFAULT_ASSESSMENT_MANAGER_CONFIG: AssessmentManagerConfig = {
  assessmentTypes: DEFAULT_ASSESSMENT_TYPES,
};
