// Shared AI Assessment defaults — imported by both the model (server) and
// client components. No mongoose imports here so it's safe in client bundles.

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
  // treatments regardless of which question it came from.
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
}

export interface TreatmentRecommendation {
  id: string;
  name: string;
  icon: string;
  description: string;
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
  anonymousMode: boolean;
  maxRecommendations: number;
  confidenceThreshold: number;
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
  anonymousMode: true,
  maxRecommendations: 3,
  confidenceThreshold: 0,
};

export const DEFAULT_AI_PROMPT =
  "Always recommend evidence-based dermatology and trichology treatments only. " +
  "Never recommend surgical procedures unless the concern is clearly advanced. " +
  "Always briefly explain why each treatment suits this specific concern. " +
  "Keep descriptions factual, avoid unverifiable superlatives, and return a maximum of three recommendations.";

export const DEFAULT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "concern", title: "What's your main concern?",
    subtitle: "Select the skin or hair issue that matters most to you right now",
    description: "", icon: "🎯", image: "",
    type: "single", order: 1, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    answers: [
      { id: "acne", title: "Acne & Breakouts", description: "", icon: "🔴", image: "", score: 0, tags: ["acne"], weight: 100, nextQuestionId: "" },
      { id: "pigmentation", title: "Pigmentation & Dark Spots", description: "", icon: "🟫", image: "", score: 0, tags: ["pigmentation"], weight: 100, nextQuestionId: "" },
      { id: "ageing", title: "Ageing & Fine Lines", description: "", icon: "⏳", image: "", score: 0, tags: ["ageing"], weight: 100, nextQuestionId: "" },
      { id: "hair", title: "Hair Loss & Thinning", description: "", icon: "💇", image: "", score: 0, tags: ["hair"], weight: 100, nextQuestionId: "" },
      { id: "hair-removal", title: "Unwanted Hair Removal", description: "", icon: "✨", image: "", score: 0, tags: ["hair-removal"], weight: 100, nextQuestionId: "" },
      { id: "glow", title: "General Glow & Refresh", description: "", icon: "🌟", image: "", score: 0, tags: ["glow"], weight: 100, nextQuestionId: "" },
    ],
  },
  {
    id: "skin-type", title: "What's your skin type?",
    subtitle: "This helps us choose the safest, most effective treatments for you",
    description: "", icon: "🧴", image: "",
    type: "single", order: 2, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
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
    subtitle: "So we can recommend the right level of treatment",
    description: "", icon: "🌱", image: "",
    type: "single", order: 3, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    answers: [
      { id: "first-timer", title: "First timer", description: "Never had professional treatment", icon: "🌱", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "some-experience", title: "Some experience", description: "Had basic facials or peels", icon: "🌿", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "experienced", title: "Experienced", description: "Done PRP, laser, or advanced treatments", icon: "🌳", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    ],
  },
  {
    id: "budget", title: "What's your budget per session?",
    subtitle: "We have excellent options at every price point",
    description: "", icon: "💰", image: "",
    type: "single", order: 4, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    answers: [
      { id: "under-5k", title: "Under ₹5,000 per session", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "5k-15k", title: "₹5,000 – ₹15,000 per session", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "15k-plus", title: "₹15,000+ (premium treatments)", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "open-to-packages", title: "Open to packages", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    ],
  },
  {
    id: "timeline", title: "When do you want to start?",
    subtitle: "We'll tailor the urgency of our recommendations accordingly",
    description: "", icon: "📅", image: "",
    type: "single", order: 5, required: true,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    answers: [
      { id: "asap", title: "ASAP", description: "I want to start this week", icon: "⚡", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "this-month", title: "This month", description: "Planning within 30 days", icon: "📅", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "exploring", title: "Exploring", description: "Just researching options", icon: "🔍", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    ],
  },
  // Demographic + photo questions — informational for the doctor's review,
  // not scoring inputs (no tags/weight), so they never change which
  // treatments get recommended. All optional by default (required: false);
  // the visitor can always skip a photo upload regardless of this setting —
  // see the public page's canProceed logic.
  {
    id: "gender", title: "What's your gender?",
    subtitle: "Helps your doctor tailor their assessment",
    description: "", icon: "🧑", image: "",
    type: "single", order: 6, required: false,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    answers: [
      { id: "male", title: "Male", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
      { id: "female", title: "Female", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" },
    ],
  },
  {
    id: "age", title: "What's your age?",
    subtitle: "Helps your doctor tailor their assessment",
    description: "", icon: "🎂", image: "",
    type: "number", order: 7, required: false,
    sliderMin: 12, sliderMax: 80, sliderStep: 1, sliderUnit: "years",
    answers: [],
  },
  {
    id: "photo", title: "Add a photo",
    subtitle: "Optional — helps your doctor give a more accurate assessment",
    description: "", icon: "📷", image: "",
    type: "photo", order: 8, required: false,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    answers: [],
  },
  {
    id: "notes", title: "Anything else you'd like your doctor to know?",
    subtitle: "Optional — describe your concern in your own words",
    description: "", icon: "📝", image: "",
    type: "text", order: 9, required: false,
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
    answers: [],
  },
];

export const DEFAULT_TREATMENT_MAP: TreatmentMapEntry[] = [
  {
    concernTag: "acne", concernLabel: "Acne & Breakouts",
    treatments: [
      { id: "chemical-peel-acne", name: "Chemical Peel", icon: "⚗️", description: "Removes dead skin, unclogs pores, reduces active acne and post-acne marks", confidence: 96, priority: 1, sessions: "4–6 sessions, every 3 weeks", duration: "30 min", recovery: "Minimal, mild redness for a day", price: "₹3,000 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "hydrafacial-acne", name: "Hydra Facial", icon: "💧", description: "Deep cleanse + extraction + hydration. Immediate glow, zero downtime", confidence: 88, priority: 2, sessions: "Monthly maintenance", duration: "45 min", recovery: "None", price: "₹5,000 – ₹12,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "laser-acne", name: "Laser Acne Treatment", icon: "⚡", description: "Kills acne-causing bacteria and reduces oil production at the source", confidence: 82, priority: 3, sessions: "6–8 sessions", duration: "20 min", recovery: "Minimal", price: "₹8,000 – ₹18,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
    ],
  },
  {
    concernTag: "pigmentation", concernLabel: "Pigmentation & Dark Spots",
    treatments: [
      { id: "qswitch-pigmentation", name: "Q-Switch Laser", icon: "🎯", description: "Targets melanin clusters to break up pigmentation without damaging surrounding skin", confidence: 95, priority: 1, sessions: "4–8 sessions", duration: "20 min", recovery: "Minimal", price: "₹6,000 – ₹15,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "chemical-peel-pigmentation", name: "Chemical Peel", icon: "⚗️", description: "Accelerates cell turnover to fade dark spots and even skin tone", confidence: 87, priority: 2, sessions: "4–6 sessions", duration: "30 min", recovery: "Minimal", price: "₹3,000 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "vitc-pigmentation", name: "Vitamin C Infusion", icon: "🍋", description: "Medical-grade brightening treatment that inhibits melanin production", confidence: 80, priority: 3, sessions: "6 sessions", duration: "40 min", recovery: "None", price: "₹4,000 – ₹9,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
    ],
  },
  {
    concernTag: "ageing", concernLabel: "Ageing & Fine Lines",
    treatments: [
      { id: "antiageing-facial", name: "Anti-Ageing Facial", icon: "✨", description: "Collagen-boosting treatment with peptides and growth factors for firmer, plumper skin", confidence: 94, priority: 1, sessions: "6–8 sessions", duration: "45 min", recovery: "None", price: "₹8,000 – ₹20,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "botox-fillers", name: "Botox / Fillers", icon: "💉", description: "Smooths expression lines and restores volume for a refreshed, natural look", confidence: 89, priority: 2, sessions: "Once every 4–6 months", duration: "20 min", recovery: "Minimal, 1-2 days", price: "₹15,000 – ₹40,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "hifu", name: "HIFU Skin Tightening", icon: "🔊", description: "Non-surgical facelift using high-intensity ultrasound energy to lift and tighten", confidence: 83, priority: 3, sessions: "1–2 sessions/year", duration: "60 min", recovery: "None", price: "₹25,000 – ₹60,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
    ],
  },
  {
    concernTag: "hair", concernLabel: "Hair Loss & Thinning",
    treatments: [
      { id: "prp-hair", name: "PRP Hair Treatment", icon: "🩸", description: "Your own platelet-rich plasma injected into the scalp to stimulate dormant follicles", confidence: 96, priority: 1, sessions: "6–8 sessions, monthly", duration: "45 min", recovery: "Minimal", price: "₹8,000 – ₹15,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "gfc-hair", name: "GFC Hair Treatment", icon: "🧬", description: "Next-generation Growth Factor Concentrate — 3x more potent than standard PRP", confidence: 91, priority: 2, sessions: "4–6 sessions", duration: "45 min", recovery: "Minimal", price: "₹12,000 – ₹20,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "meso-hair", name: "Mesotherapy for Hair", icon: "💊", description: "Micro-injections of vitamins and minerals directly into the scalp for maximum absorption", confidence: 83, priority: 3, sessions: "8–10 sessions", duration: "30 min", recovery: "None", price: "₹5,000 – ₹10,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
    ],
  },
  {
    concernTag: "hair-removal", concernLabel: "Unwanted Hair Removal",
    treatments: [
      { id: "laser-hair-removal", name: "Laser Hair Removal", icon: "⚡", description: "Permanent reduction of unwanted hair. Safe for all skin tones with our diode laser", confidence: 98, priority: 1, sessions: "6–8 sessions per area", duration: "30 min", recovery: "None", price: "₹2,000 – ₹15,000/area", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "full-body-laser", name: "Full Body Laser Package", icon: "🌟", description: "Complete hair-free solution for face + arms + legs + underarms + bikini", confidence: 90, priority: 2, sessions: "8 sessions", duration: "90 min", recovery: "None", price: "₹45,000 – ₹80,000 package", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "ipl-hair-removal", name: "IPL Hair Reduction", icon: "💡", description: "Intense Pulsed Light for lighter hair colours. Gentler than laser", confidence: 78, priority: 3, sessions: "8–10 sessions", duration: "30 min", recovery: "None", price: "₹3,000 – ₹12,000/area", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
    ],
  },
  {
    concernTag: "glow", concernLabel: "General Glow & Refresh",
    treatments: [
      { id: "hydrafacial-glow", name: "Hydra Facial", icon: "💧", description: "Cleanse + exfoliate + extract + hydrate + protect. Instant glow, zero downtime", confidence: 97, priority: 1, sessions: "Monthly", duration: "45 min", recovery: "None", price: "₹5,000 – ₹12,000", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "brightening-peel", name: "Skin Brightening Peel", icon: "🍑", description: "Medical-grade fruit acid peel that reveals fresher, brighter skin underneath", confidence: 89, priority: 2, sessions: "4–6 sessions", duration: "30 min", recovery: "Minimal", price: "₹3,500 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
      { id: "iv-glow-drip", name: "IV Glow Drip", icon: "✨", description: "Glutathione + Vitamin C intravenous infusion for full-body skin brightening and radiance", confidence: 82, priority: 3, sessions: "8–12 sessions", duration: "45 min", recovery: "None", price: "₹4,000 – ₹8,000/session", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] },
    ],
  },
];

export const DEFAULT_QUIZ_CONFIG: AssessmentConfigData = {
  questions: DEFAULT_QUESTIONS,
  treatmentMap: DEFAULT_TREATMENT_MAP,
  aiPrompt: DEFAULT_AI_PROMPT,
  settings: DEFAULT_ASSESSMENT_SETTINGS,
  resultSections: DEFAULT_RESULT_SECTIONS,
  doctorMessage: "Every recommendation above is based on your specific answers. For the most accurate diagnosis and treatment plan, we recommend a free consultation with one of our specialists.",
};
