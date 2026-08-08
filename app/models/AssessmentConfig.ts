import mongoose from "mongoose";
import { DEFAULT_ASSESSMENT_TYPES } from "@/app/lib/assessmentTypeDefaults";
export { DEFAULT_ASSESSMENT_TYPES } from "@/app/lib/assessmentTypeDefaults";

// Pre-Consultation Assessment config — one singleton document holding an
// array of type-configs (hair/skin/body), NOT three separate documents and
// NOT a reuse of the legacy QuizConfig collection (which stays untouched,
// still serving Plan My Journey — see architecture review §03A/§13). Same
// singleton-with-array pattern as every other CMS config in this codebase.

const AnswerSchema = new mongoose.Schema({
  id:                  { type: String, required: true },
  title:               { type: String, required: true },
  description:         { type: String, default: "" },
  icon:                { type: String, default: "" },
  image:               { type: String, default: "" },
  score:               { type: Number, default: 0 },
  tags:                { type: [String], default: [] },
  weight:              { type: Number, default: 0 },
  nextQuestionId:       { type: String, default: "" },
  riskWeight:           { type: Number, default: 0 },
  followUpQuestionIds:  { type: [String], default: [] },
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  id:          { type: String, required: true },
  title:       { type: String, required: true },
  subtitle:    { type: String, default: "" },
  description: { type: String, default: "" },
  icon:        { type: String, default: "" },
  image:       { type: String, default: "" },
  type:        { type: String, enum: ["single", "multi", "slider", "yesno", "number", "dropdown", "image", "emoji", "photo", "text"], default: "single" },
  order:       { type: Number, required: true },
  required:    { type: Boolean, default: true },
  answers:     { type: [AnswerSchema], default: [] },
  sliderMin:   { type: Number, default: 0 },
  sliderMax:   { type: Number, default: 100 },
  sliderStep:  { type: Number, default: 1 },
  sliderUnit:  { type: String, default: "" },
  conditionTags: { type: [String], default: [] },
}, { _id: false });

const ScoringCategorySchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  maxWeight: { type: Number, default: 100 },
  importance: { type: Number, default: 1 },
  order: { type: Number, default: 0 },
}, { _id: false });

const SeverityBandSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  label: { type: String, required: true },
}, { _id: false });

const ContributingFactorRuleSchema = new mongoose.Schema({
  tag: { type: String, required: true },
  label: { type: String, required: true },
  detail: { type: String, default: "" },
}, { _id: false });

const CtaButtonSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, enum: ["book", "content", "chat"], default: "book" },
  href: { type: String, default: "" },
}, { _id: false });

const CtaRuleSchema = new mongoose.Schema({
  severity: { type: String, required: true },
  headline: { type: String, default: "" },
  body: { type: String, default: "" },
  buttons: { type: [CtaButtonSchema], default: [] },
}, { _id: false });

// Reused verbatim from the legacy QuizConfig TreatmentSchema shape — Doctor
// Review Mode / doctor-summary / care-plan all already know how to read
// this shape, and it never changes for the new engine (see §03A).
const TreatmentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, default: "✨" },
  description: { type: String, default: "" },
  confidence: { type: Number, default: 90, min: 0, max: 100 },
  priority: { type: Number, default: 1 },
  sessions: { type: String, default: "" },
  duration: { type: String, default: "" },
  recovery: { type: String, default: "" },
  price: { type: String, default: "" },
  advantages: { type: [String], default: [] },
  disadvantages: { type: [String], default: [] },
  cta: { type: String, default: "Book Consultation" },
  requiredTags: { type: [String], default: [] },
  clinicalIndicators: { type: [String], default: [] },
  possibleCauses: { type: [String], default: [] },
  suggestedEvaluation: { type: [String], default: [] },
  contraindications: { type: [String], default: [] },
  doctorNotes: { type: String, default: "" },
  patientEducation: { type: [String], default: [] },
  confidenceLevel: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
}, { _id: false });

const TreatmentMapEntrySchema = new mongoose.Schema({
  concernTag: { type: String, required: true },
  concernLabel: { type: String, default: "" },
  treatments: { type: [TreatmentSchema], default: [] },
}, { _id: false });

const AssessmentTypeSchema = new mongoose.Schema({
  key: { type: String, enum: ["hair", "skin", "body"], required: true },
  label: { type: String, required: true },
  icon: { type: String, default: "" },
  colorFrom: { type: String, default: "#0B2560" },
  colorTo: { type: String, default: "#3B82C4" },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  questions: { type: [QuestionSchema], default: [] },
  categories: { type: [ScoringCategorySchema], default: [] },
  riskFactorTags: { type: [String], default: [] },
  riskMaxWeight: { type: Number, default: 100 },
  severityThresholds: { type: [SeverityBandSchema], default: [] },
  riskThresholds: { type: [SeverityBandSchema], default: [] },
  contributingFactorRules: { type: [ContributingFactorRuleSchema], default: [] },
  ctaRules: { type: [CtaRuleSchema], default: [] },
  resultTemplate: {
    headline: { type: String, default: "" },
    disclaimer: { type: String, default: "" },
  },
  treatmentMap: { type: [TreatmentMapEntrySchema], default: [] },
}, { _id: false });

const AssessmentConfigSchema = new mongoose.Schema({
  assessmentTypes: { type: [AssessmentTypeSchema], default: () => DEFAULT_ASSESSMENT_TYPES },
}, { timestamps: true });

export default mongoose.models.AssessmentConfig ||
  mongoose.model("AssessmentConfig", AssessmentConfigSchema);
