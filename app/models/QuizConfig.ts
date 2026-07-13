import mongoose from "mongoose";
export { DEFAULT_QUIZ_CONFIG } from "@/app/lib/quizDefaults";

const AnswerSchema = new mongoose.Schema({
  id:             { type: String, required: true },
  title:          { type: String, required: true },
  description:    { type: String, default: "" },
  icon:           { type: String, default: "" },
  image:          { type: String, default: "" },
  score:          { type: Number, default: 0 },
  tags:           { type: [String], default: [] },
  weight:         { type: Number, default: 0 },
  nextQuestionId: { type: String, default: "" },
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
}, { _id: false });

const TreatmentSchema = new mongoose.Schema({
  id:             { type: String, required: true },
  name:           { type: String, required: true },
  icon:           { type: String, default: "✨" },
  description:    { type: String, default: "" },
  confidence:     { type: Number, default: 90, min: 0, max: 100 },
  priority:       { type: Number, default: 1 },
  sessions:       { type: String, default: "" },
  duration:       { type: String, default: "" },
  recovery:       { type: String, default: "" },
  price:          { type: String, default: "" },
  advantages:     { type: [String], default: [] },
  disadvantages:  { type: [String], default: [] },
  cta:            { type: String, default: "Book Consultation" },
  requiredTags:   { type: [String], default: [] },
}, { _id: false });

const TreatmentMapSchema = new mongoose.Schema({
  concernTag:   { type: String, required: true },
  concernLabel: { type: String, default: "" },
  treatments:   { type: [TreatmentSchema], default: [] },
}, { _id: false });

const ResultSectionSchema = new mongoose.Schema({
  key:     { type: String, required: true },
  label:   { type: String, default: "" },
  visible: { type: Boolean, default: true },
  order:   { type: Number, default: 0 },
}, { _id: false });

const SettingsSchema = new mongoose.Schema({
  enabled:             { type: Boolean, default: true },
  enableAI:            { type: Boolean, default: true },
  enableEmail:         { type: Boolean, default: true },
  enablePDF:           { type: Boolean, default: false },
  enableQR:            { type: Boolean, default: true },
  enableNotes:         { type: Boolean, default: true },
  anonymousMode:       { type: Boolean, default: true },
  maxRecommendations:  { type: Number, default: 3 },
  confidenceThreshold: { type: Number, default: 0 },
}, { _id: false });

const QuizConfigSchema = new mongoose.Schema({
  questions:      { type: [QuestionSchema],     default: [] },
  treatmentMap:   { type: [TreatmentMapSchema], default: [] },
  aiPrompt:       { type: String, default: "" },
  settings:       { type: SettingsSchema, default: () => ({}) },
  resultSections: { type: [ResultSectionSchema], default: [] },
  doctorMessage:  { type: String, default: "" },
}, { timestamps: true });

export default mongoose.models.QuizConfig ||
  mongoose.model("QuizConfig", QuizConfigSchema);
