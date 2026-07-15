// Shared Clinical Intake defaults — imported by both the model (server) and
// client components. No mongoose imports here so it's safe in client bundles.
import { deriveConfidenceLevel } from "./confidenceLevel";

export type QuestionType = "single" | "multi" | "slider" | "yesno" | "number" | "dropdown" | "image" | "emoji" | "photo" | "text";

export interface AssessmentAnswer {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
  score: number;
  // Short slugs used by the scoring engine to match answers to treatments —
  // e.g. an answer tagged "hair" contributes weight toward hair-related
  // treatments regardless of which question it came from. A concern answer
  // typically carries both its own specific tag (e.g. "hair-fall") and a
  // broader umbrella tag (e.g. "hair") so it both drives question filtering
  // precisely and still finds treatmentMap entries keyed by the umbrella.
  tags: string[];
  weight: number;
  // Branching: which question to show next. '' = continue in the default order.
  nextQuestionId: string;
}

export interface AssessmentQuestion {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  image: string;
  type: QuestionType;
  order: number;
  required: boolean;
  answers: AssessmentAnswer[];
  // Only used when type === 'slider' | 'number'
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  sliderUnit: string;
  // Which concern tag(s) this question applies under — matched against the
  // tags carried by the patient's chosen concern answer(s). Empty = universal
  // (always shown, e.g. skin type, gender, age, photo, notes).
  conditionTags: string[];
}

export interface TreatmentRecommendation {
  id: string;
  name: string;
  icon: string;
  description: string;
  // Internal sort/threshold key only — never shown directly (see
  // confidenceLevel). Kept numeric so the scoring engine's ranking is
  // unaffected by the Clinical Intelligence Engine's display-only rework.
  confidence: number;
  priority: number;
  sessions: string;
  duration: string;
  recovery: string;
  price: string;
  advantages: string[];
  disadvantages: string[];
  cta: string;
  // Simple eligibility gate — a first version of "Recommendation Rules":
  // if set, this treatment only qualifies when the visitor's answers carried
  // at least one of these tags. Empty = always eligible whenever its
  // concernTag matches (today's behaviour, preserved as the default).
  requiredTags: string[];
  // Clinical Intelligence Engine fields (content authored progressively via
  // admin — Phase 1 builds the dedicated editor UI for these).
  clinicalIndicators: string[];
  possibleCauses: string[];
  suggestedEvaluation: string[];
  contraindications: string[];
  doctorNotes: string;
  patientEducation: string[];
  // The only confidence value ever shown to a doctor or patient.
  confidenceLevel: "High" | "Medium" | "Low";
}

export interface TreatmentMapEntry {
  concernTag: string;
  concernLabel: string;
  treatments: TreatmentRecommendation[];
}

export interface AssessmentSettings {
  enabled: boolean;
  enableAI: boolean;
  enableEmail: boolean;
  enablePDF: boolean;
  enableQR: boolean;
  // Master on/off for any "text"-type question (e.g. "Anything else for your
  // doctor?") — lets a doctor toggle free-text note collection without
  // deleting the question and losing its custom wording.
  enableNotes: boolean;
  // Master on/off for the post-results "Chat with AI about your results"
  // follow-up assistant (app/api/assessment-chat) — separate from enableAI,
  // which only gates the admin's Treatment Mapping AI Suggest tool.
  enableChat: boolean;
  anonymousMode: boolean;
  maxRecommendations: number;
  confidenceThreshold: number;
  // Doctor Notes Templates — reusable snippets a doctor can quick-insert
  // into a lead's Doctor Notes field in the Doctor Dashboard, instead of
  // retyping common phrasing for every patient.
  doctorNoteTemplates: string[];
}

export interface ResultSectionConfig {
  key: "topRecommendation" | "allRecommendations" | "doctorMessage" | "bookCta" | "emailForm";
  label: string;
  visible: boolean;
  order: number;
}

export interface AssessmentConfigData {
  questions: AssessmentQuestion[];
  treatmentMap: TreatmentMapEntry[];
  // Custom system prompt used when a doctor clicks "AI Suggest" while
  // authoring treatment mapping content (see app/api/admin/quiz/ai-suggest).
  aiPrompt: string;
  settings: AssessmentSettings;
  resultSections: ResultSectionConfig[];
  doctorMessage: string;
}

export const DEFAULT_RESULT_SECTIONS: ResultSectionConfig[] = [
  { key: "topRecommendation", label: "Top Recommendation", visible: true, order: 1 },
  { key: "allRecommendations", label: "All Recommendations", visible: true, order: 2 },
  { key: "doctorMessage", label: "Doctor's Message", visible: true, order: 3 },
  { key: "bookCta", label: "Book Consultation Button", visible: true, order: 4 },
  { key: "emailForm", label: "Email My Plan Form", visible: true, order: 5 },
];

export const DEFAULT_ASSESSMENT_SETTINGS: AssessmentSettings = {
  enabled: true,
  enableAI: true,
  enableEmail: true,
  enablePDF: false,
  enableQR: true,
  enableNotes: true,
  enableChat: true,
  anonymousMode: true,
  maxRecommendations: 3,
  confidenceThreshold: 0,
  doctorNoteTemplates: [
    "Discussed possible causes and next steps; patient understands this is a starting point, not a diagnosis.",
    "Recommended in-clinic evaluation before finalizing any treatment.",
    "Patient has no known contraindications reported at intake — to be reconfirmed in person.",
  ],
};

export const DEFAULT_AI_PROMPT =
  "You are assisting a dermatology clinic's clinical intake process, not diagnosing or prescribing. " +
  "Only ever propose evidence-based dermatology and trichology treatment CATEGORIES for a doctor to " +
  "discuss with the patient after their own evaluation — never state that a specific treatment is " +
  "needed or guaranteed to work. Never recommend surgical procedures unless the concern is clearly " +
  "advanced. Briefly explain why each category is relevant to this specific concern. Keep descriptions " +
  "factual, avoid unverifiable superlatives, and return a maximum of three categories.";

function yesNo(id: string): AssessmentAnswer[] {
  return [
    { id: `${id}-yes`, title: "Yes", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: `${id}-no`, title: "No", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
  ];
}

function durationAnswers(): AssessmentAnswer[] {
  return [
    { id: "under-3m", title: "Less than 3 months", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "3-6m", title: "3–6 months", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "6-12m", title: "6–12 months", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "1-2y", title: "1–2 years", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "2y-plus", title: "More than 2 years", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
  ];
}

export const DEFAULT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "concern", title: "What's your main concern?",
    subtitle: "Select the skin or hair issue(s) that matter most to you right now",
    description: "", icon: "🎯", image: "",
    type: "multi", order: 1, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    conditionTags: [],
    answers: [
      { id: "hair-fall", title: "Hair Fall", description: "", icon: "💇", image: "", score: 0, tags: ["hair-fall", "hair"], weight: 100, nextQuestionId: "" },
      { id: "hair-thinning", title: "Hair Thinning", description: "", icon: "💇", image: "", score: 0, tags: ["hair-thinning", "hair"], weight: 100, nextQuestionId: "" },
      { id: "baldness", title: "Baldness", description: "", icon: "👨‍🦲", image: "", score: 0, tags: ["baldness", "hair"], weight: 100, nextQuestionId: "" },
      { id: "hair-transplant", title: "Hair Transplant", description: "", icon: "🌱", image: "", score: 0, tags: ["hair-transplant", "hair"], weight: 100, nextQuestionId: "" },
      { id: "acne", title: "Acne", description: "", icon: "🔴", image: "", score: 0, tags: ["acne"], weight: 100, nextQuestionId: "" },
      { id: "pigmentation", title: "Pigmentation", description: "", icon: "🟫", image: "", score: 0, tags: ["pigmentation"], weight: 100, nextQuestionId: "" },
      { id: "melasma", title: "Melasma", description: "", icon: "🟤", image: "", score: 0, tags: ["melasma", "pigmentation"], weight: 100, nextQuestionId: "" },
      { id: "anti-aging", title: "Anti Aging", description: "", icon: "⏳", image: "", score: 0, tags: ["anti-aging", "ageing"], weight: 100, nextQuestionId: "" },
      { id: "laser-hair-removal", title: "Laser Hair Removal", description: "", icon: "✨", image: "", score: 0, tags: ["laser-hair-removal", "hair-removal"], weight: 100, nextQuestionId: "" },
      { id: "skin-brightening", title: "Skin Brightening", description: "", icon: "🌟", image: "", score: 0, tags: ["skin-brightening", "glow"], weight: 100, nextQuestionId: "" },
      { id: "tattoo-removal", title: "Tattoo Removal", description: "", icon: "🖊️", image: "", score: 0, tags: ["tattoo-removal"], weight: 100, nextQuestionId: "" },
    ],
  },
  {
    id: "skin-type", title: "What's your skin type?",
    subtitle: "This helps us choose the safest, most effective treatments for you",
    description: "", icon: "🧴", image: "",
    type: "single", order: 2, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    conditionTags: [],
    answers: [
      { id: "oily", title: "Oily", description: "Shiny, large pores, prone to acne", icon: "💧", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "dry", title: "Dry", description: "Tight, flaky, dull", icon: "🌵", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "combination", title: "Combination", description: "Oily T-zone, dry cheeks", icon: "🌊", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "sensitive", title: "Sensitive", description: "Redness, reacts easily", icon: "🌹", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "normal", title: "Normal", description: "Balanced, few issues", icon: "✅", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    ],
  },
  {
    id: "experience", title: "Your treatment experience?",
    subtitle: "So we can recommend the right level of treatment for your doctor to discuss",
    description: "", icon: "🌱", image: "",
    type: "single", order: 3, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    conditionTags: [],
    answers: [
      { id: "first-timer", title: "First timer", description: "Never had professional treatment", icon: "🌱", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "some-experience", title: "Some experience", description: "Had basic facials or peels", icon: "🌿", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "experienced", title: "Experienced", description: "Done PRP, laser, or advanced treatments", icon: "🌳", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    ],
  },

  // ── Hair Fall / Hair Thinning / Baldness / Hair Transplant follow-ups ──
  // Shared under the "hair" umbrella tag — clinically, intake questions for
  // hair-loss sub-types overlap heavily; the doctor differentiates via exam.
  { id: "hair-duration", title: "How long have you noticed hair fall?", subtitle: "", description: "", icon: "🕒", image: "", type: "single", order: 10, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: durationAnswers() },
  { id: "hair-family-history", title: "Any family history of hair loss?", subtitle: "Parents, siblings, or grandparents", description: "", icon: "👪", image: "", type: "yesno", order: 11, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: yesNo("hair-family-history") },
  { id: "hair-stress", title: "How would you rate your recent stress levels?", subtitle: "", description: "", icon: "😮‍💨", image: "", type: "single", order: 12, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: [
    { id: "low", title: "Low", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "moderate", title: "Moderate", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "high", title: "High", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
  ] },
  { id: "hair-dandruff", title: "Do you have dandruff or an itchy, flaky scalp?", subtitle: "", description: "", icon: "❄️", image: "", type: "yesno", order: 13, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: yesNo("hair-dandruff") },
  { id: "hair-illness", title: "Any recent illness, fever, or surgery?", subtitle: "In the last 3–6 months", description: "", icon: "🤒", image: "", type: "yesno", order: 14, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: yesNo("hair-illness") },
  { id: "hair-weight-loss", title: "Any sudden or significant weight loss recently?", subtitle: "", description: "", icon: "⚖️", image: "", type: "yesno", order: 15, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: yesNo("hair-weight-loss") },
  { id: "hair-previous-treatments", title: "Have you tried any of these before?", subtitle: "Select all that apply", description: "", icon: "🧪", image: "", type: "multi", order: 16, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: [
    { id: "minoxidil", title: "Minoxidil / topical", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "finasteride", title: "Finasteride / oral medication", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "prp-tried", title: "PRP", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "transplant-tried", title: "Hair Transplant", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "none-tried", title: "None so far", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
  ] },
  { id: "hair-scalp-itching", title: "Is your scalp itchy or irritated?", subtitle: "", description: "", icon: "🤚", image: "", type: "yesno", order: 17, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: yesNo("hair-scalp-itching") },
  { id: "hair-pregnancy", title: "Are you currently pregnant or breastfeeding?", subtitle: "If applicable", description: "", icon: "🤰", image: "", type: "yesno", order: 18, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: yesNo("hair-pregnancy") },
  { id: "hair-medications", title: "Are you currently on any medications?", subtitle: "List any you're currently taking, if relevant", description: "", icon: "💊", image: "", type: "text", order: 19, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["hair"], answers: [] },

  // ── Acne follow-ups ──
  { id: "acne-duration", title: "How long have you had this acne?", subtitle: "", description: "", icon: "🕒", image: "", type: "single", order: 20, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: durationAnswers() },
  { id: "acne-pain", title: "Is the acne painful or tender to touch?", subtitle: "", description: "", icon: "🩹", image: "", type: "yesno", order: 21, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: yesNo("acne-pain") },
  { id: "acne-inflammation", title: "How would you describe the inflammation?", subtitle: "", description: "", icon: "🔥", image: "", type: "single", order: 22, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: [
    { id: "none", title: "None — mostly blackheads/whiteheads", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "mild", title: "Mild redness", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "severe", title: "Severe — cystic or pus-filled", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
  ] },
  { id: "acne-oily-skin", title: "Would you describe your skin as very oily?", subtitle: "", description: "", icon: "💧", image: "", type: "yesno", order: 23, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: yesNo("acne-oily-skin") },
  { id: "acne-previous-treatment", title: "Have you tried any of these before?", subtitle: "Select all that apply", description: "", icon: "🧪", image: "", type: "multi", order: 24, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: [
    { id: "topical-creams", title: "Topical creams", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "oral-medication", title: "Oral medication", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "chemical-peel-tried", title: "Chemical peel", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "laser-tried", title: "Laser treatment", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "none-tried-acne", title: "None so far", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
  ] },
  { id: "acne-hormonal-issues", title: "Do you have any known hormonal issues?", subtitle: "", description: "", icon: "⚖️", image: "", type: "yesno", order: 25, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: yesNo("acne-hormonal-issues") },
  { id: "acne-pcos", title: "Have you been diagnosed with PCOS/PCOD?", subtitle: "", description: "", icon: "🩺", image: "", type: "yesno", order: 26, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: yesNo("acne-pcos") },
  { id: "acne-scarring", title: "Has the acne left any scarring?", subtitle: "", description: "", icon: "📍", image: "", type: "yesno", order: 27, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: yesNo("acne-scarring") },
  { id: "acne-lifestyle", title: "Anything about your lifestyle your doctor should know?", subtitle: "Diet, sleep, stress — optional", description: "", icon: "📝", image: "", type: "text", order: 28, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["acne"], answers: [] },

  // ── Pigmentation / Melasma follow-ups ──
  { id: "pigmentation-sun-exposure", title: "How much daily sun exposure do you typically get?", subtitle: "", description: "", icon: "☀️", image: "", type: "single", order: 30, required: true, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["pigmentation"], answers: [
    { id: "minimal", title: "Minimal (mostly indoors)", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "moderate", title: "Moderate (some outdoor time)", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    { id: "high", title: "High (outdoors most of the day)", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
  ] },
  { id: "pigmentation-pregnancy", title: "Are you currently pregnant, or was this pigmentation pregnancy-related?", subtitle: "If applicable", description: "", icon: "🤰", image: "", type: "yesno", order: 31, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["pigmentation"], answers: yesNo("pigmentation-pregnancy") },
  { id: "pigmentation-hormonal-history", title: "Any known hormonal history relevant to this?", subtitle: "e.g. contraceptive use, thyroid, PCOS", description: "", icon: "⚖️", image: "", type: "yesno", order: 32, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["pigmentation"], answers: yesNo("pigmentation-hormonal-history") },
  { id: "pigmentation-previous-creams", title: "Which creams or products have you already tried?", subtitle: "Optional", description: "", icon: "🧴", image: "", type: "text", order: 33, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["pigmentation"], answers: [] },
  { id: "pigmentation-laser-history", title: "Have you had any laser treatment before?", subtitle: "", description: "", icon: "⚡", image: "", type: "yesno", order: 34, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["pigmentation"], answers: yesNo("pigmentation-laser-history") },
  { id: "pigmentation-skin-sensitivity", title: "Would you describe your skin as sensitive or easily irritated?", subtitle: "", description: "", icon: "🌹", image: "", type: "yesno", order: 35, required: false, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: ["pigmentation"], answers: yesNo("pigmentation-skin-sensitivity") },

  // Demographic + photo questions — informational for the doctor's review,
  // not scoring inputs (no tags/weight), so they never change which
  // treatments get recommended. All optional by default (required: false);
  // the visitor can always skip a photo upload regardless of this setting —
  // see the public page's canProceed logic. Universal (conditionTags: []).
  {
    id: "gender", title: "What's your gender?",
    subtitle: "Helps your doctor tailor their assessment",
    description: "", icon: "🧑", image: "",
    type: "single", order: 40, required: false,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    conditionTags: [],
    answers: [
      { id: "male", title: "Male", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "female", title: "Female", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    ],
  },
  {
    id: "age", title: "What's your age?",
    subtitle: "Helps your doctor tailor their assessment",
    description: "", icon: "🎂", image: "",
    type: "number", order: 41, required: false,
    sliderMin: 12, sliderMax: 80, sliderStep: 1, sliderUnit: "years",
    conditionTags: [],
    answers: [],
  },
  {
    id: "photo", title: "Add a photo",
    subtitle: "Optional — helps your doctor give a more accurate assessment",
    description: "", icon: "📷", image: "",
    type: "photo", order: 42, required: false,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    conditionTags: [],
    answers: [],
  },
  {
    id: "notes", title: "Anything else you'd like your doctor to know?",
    subtitle: "Optional — describe your concern in your own words",
    description: "", icon: "📝", image: "",
    type: "text", order: 43, required: false,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    conditionTags: [],
    answers: [],
  },
];

// clinicalIndicators/possibleCauses/suggestedEvaluation/contraindications/
// doctorNotes/patientEducation are left empty in this seed — Phase 1
// (Clinical Intelligence Engine) is where this content is authored; adding
// placeholder text here would risk shipping unreviewed clinical copy.
// confidenceLevel is deliberately NOT included here — it's derived per
// treatment from that treatment's own `confidence` below (a shared static
// value here would mask each entry's real threshold).
const CLINICAL_FIELDS_PLACEHOLDER = {
  clinicalIndicators: [] as string[],
  possibleCauses: [] as string[],
  suggestedEvaluation: [] as string[],
  contraindications: [] as string[],
  doctorNotes: "",
  patientEducation: [] as string[],
};

// confidenceLevel is intentionally omitted here — it's derived per
// treatment from `confidence` right after this literal (see
// RAW_DEFAULT_TREATMENT_MAP.map below), not authored by hand.
type RawTreatment = Omit<TreatmentRecommendation, "confidenceLevel">;
type RawTreatmentMapEntry = Omit<TreatmentMapEntry, "treatments"> & { treatments: RawTreatment[] };

const RAW_DEFAULT_TREATMENT_MAP: RawTreatmentMapEntry[] = [
  {
    concernTag: "acne", concernLabel: "Acne & Breakouts",
    treatments: [
      { id: "chemical-peel-acne", name: "Chemical Peel", icon: "⚗️", description: "Removes dead skin, unclogs pores, reduces active acne and post-acne marks", confidence: 96, priority: 1, sessions: "4–6 sessions, every 3 weeks", duration: "30 min", recovery: "Minimal, mild redness for a day", price: "₹3,000 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "hydrafacial-acne", name: "Hydra Facial", icon: "💧", description: "Deep cleanse + extraction + hydration. Immediate glow, zero downtime", confidence: 88, priority: 2, sessions: "Monthly maintenance", duration: "45 min", recovery: "None", price: "₹5,000 – ₹12,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "laser-acne", name: "Laser Acne Treatment", icon: "⚡", description: "Kills acne-causing bacteria and reduces oil production at the source", confidence: 82, priority: 3, sessions: "6–8 sessions", duration: "20 min", recovery: "Minimal", price: "₹8,000 – ₹18,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
    ],
  },
  {
    concernTag: "pigmentation", concernLabel: "Pigmentation & Dark Spots",
    treatments: [
      { id: "qswitch-pigmentation", name: "Q-Switch Laser", icon: "🎯", description: "Targets melanin clusters to break up pigmentation without damaging surrounding skin", confidence: 95, priority: 1, sessions: "4–8 sessions", duration: "20 min", recovery: "Minimal", price: "₹6,000 – ₹15,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "chemical-peel-pigmentation", name: "Chemical Peel", icon: "⚗️", description: "Accelerates cell turnover to fade dark spots and even skin tone", confidence: 87, priority: 2, sessions: "4–6 sessions", duration: "30 min", recovery: "Minimal", price: "₹3,000 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "vitc-pigmentation", name: "Vitamin C Infusion", icon: "🍋", description: "Medical-grade brightening treatment that inhibits melanin production", confidence: 80, priority: 3, sessions: "6 sessions", duration: "40 min", recovery: "None", price: "₹4,000 – ₹9,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
    ],
  },
  {
    concernTag: "ageing", concernLabel: "Ageing & Fine Lines",
    treatments: [
      { id: "antiageing-facial", name: "Anti-Ageing Facial", icon: "✨", description: "Collagen-boosting treatment with peptides and growth factors for firmer, plumper skin", confidence: 94, priority: 1, sessions: "6–8 sessions", duration: "45 min", recovery: "None", price: "₹8,000 – ₹20,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "botox-fillers", name: "Botox / Fillers", icon: "💉", description: "Smooths expression lines and restores volume for a refreshed, natural look", confidence: 89, priority: 2, sessions: "Once every 4–6 months", duration: "20 min", recovery: "Minimal, 1-2 days", price: "₹15,000 – ₹40,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "hifu", name: "HIFU Skin Tightening", icon: "🔊", description: "Non-surgical facelift using high-intensity ultrasound energy to lift and tighten", confidence: 83, priority: 3, sessions: "1–2 sessions/year", duration: "60 min", recovery: "None", price: "₹25,000 – ₹60,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
    ],
  },
  {
    concernTag: "hair", concernLabel: "Hair Loss & Thinning",
    treatments: [
      { id: "prp-hair", name: "PRP Hair Treatment", icon: "🩸", description: "Your own platelet-rich plasma injected into the scalp to stimulate dormant follicles", confidence: 96, priority: 1, sessions: "6–8 sessions, monthly", duration: "45 min", recovery: "Minimal", price: "₹8,000 – ₹15,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "gfc-hair", name: "GFC Hair Treatment", icon: "🧬", description: "Next-generation Growth Factor Concentrate — 3x more potent than standard PRP", confidence: 91, priority: 2, sessions: "4–6 sessions", duration: "45 min", recovery: "Minimal", price: "₹12,000 – ₹20,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "meso-hair", name: "Mesotherapy for Hair", icon: "💊", description: "Micro-injections of vitamins and minerals directly into the scalp for maximum absorption", confidence: 83, priority: 3, sessions: "8–10 sessions", duration: "30 min", recovery: "None", price: "₹5,000 – ₹10,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
    ],
  },
  {
    concernTag: "hair-removal", concernLabel: "Unwanted Hair Removal",
    treatments: [
      { id: "laser-hair-removal", name: "Laser Hair Removal", icon: "⚡", description: "Permanent reduction of unwanted hair. Safe for all skin tones with our diode laser", confidence: 98, priority: 1, sessions: "6–8 sessions per area", duration: "30 min", recovery: "None", price: "₹2,000 – ₹15,000/area", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "full-body-laser", name: "Full Body Laser Package", icon: "🌟", description: "Complete hair-free solution for face + arms + legs + underarms + bikini", confidence: 90, priority: 2, sessions: "8 sessions", duration: "90 min", recovery: "None", price: "₹45,000 – ₹80,000 package", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "ipl-hair-removal", name: "IPL Hair Reduction", icon: "💡", description: "Intense Pulsed Light for lighter hair colours. Gentler than laser", confidence: 78, priority: 3, sessions: "8–10 sessions", duration: "30 min", recovery: "None", price: "₹3,000 – ₹12,000/area", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
    ],
  },
  {
    concernTag: "glow", concernLabel: "General Glow & Refresh",
    treatments: [
      { id: "hydrafacial-glow", name: "Hydra Facial", icon: "💧", description: "Cleanse + exfoliate + extract + hydrate + protect. Instant glow, zero downtime", confidence: 97, priority: 1, sessions: "Monthly", duration: "45 min", recovery: "None", price: "₹5,000 – ₹12,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "brightening-peel", name: "Skin Brightening Peel", icon: "🍑", description: "Medical-grade fruit acid peel that reveals fresher, brighter skin underneath", confidence: 89, priority: 2, sessions: "4–6 sessions", duration: "30 min", recovery: "Minimal", price: "₹3,500 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "iv-glow-drip", name: "IV Glow Drip", icon: "✨", description: "Glutathione + Vitamin C intravenous infusion for full-body skin brightening and radiance", confidence: 82, priority: 3, sessions: "8–12 sessions", duration: "45 min", recovery: "None", price: "₹4,000 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
    ],
  },
  {
    concernTag: "tattoo-removal", concernLabel: "Tattoo Removal",
    treatments: [
      { id: "qswitch-tattoo", name: "Q-Switch Laser Tattoo Removal", icon: "🎯", description: "Breaks down tattoo ink particles for the body to clear naturally, session by session", confidence: 90, priority: 1, sessions: "6–10 sessions, 6–8 weeks apart", duration: "20–40 min", recovery: "Minimal, mild scabbing possible", price: "₹3,000 – ₹10,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
      { id: "picosecond-tattoo", name: "Picosecond Laser", icon: "⚡", description: "Faster pulses target stubborn or multi-coloured ink with fewer sessions than standard Q-switch", confidence: 85, priority: 2, sessions: "4–8 sessions", duration: "20–40 min", recovery: "Minimal", price: "₹5,000 – ₹15,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [], ...CLINICAL_FIELDS_PLACEHOLDER },
    ],
  },
];

// deriveConfidenceLevel is applied here (not baked into
// CLINICAL_FIELDS_PLACEHOLDER above) so each treatment's confidenceLevel is
// actually computed from its own `confidence` number — a shared placeholder
// value would silently mask the real thresholds for every entry.
export const DEFAULT_TREATMENT_MAP: TreatmentMapEntry[] = RAW_DEFAULT_TREATMENT_MAP.map((entry) => ({
  ...entry,
  treatments: entry.treatments.map((t) => ({ ...t, confidenceLevel: deriveConfidenceLevel(t.confidence) })),
}));

export const DEFAULT_QUIZ_CONFIG: AssessmentConfigData = {
  questions: DEFAULT_QUESTIONS,
  treatmentMap: DEFAULT_TREATMENT_MAP,
  aiPrompt: DEFAULT_AI_PROMPT,
  settings: DEFAULT_ASSESSMENT_SETTINGS,
  resultSections: DEFAULT_RESULT_SECTIONS,
  doctorMessage: "Every possible discussion topic above is based on your specific answers. Your doctor will confirm what's right for you after a full evaluation — this is a starting point for your consultation, not a diagnosis or a prescription.",
};
