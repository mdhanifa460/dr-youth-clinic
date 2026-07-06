import mongoose from "mongoose";
export { DEFAULT_QUIZ_CONFIG } from "@/app/lib/quizDefaults";

const TreatmentSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  icon:     { type: String, default: "✨" },
  desc:     { type: String, default: "" },
  sessions: { type: String, default: "" },
  price:    { type: String, default: "" },
  match:    { type: Number, default: 90, min: 0, max: 100 },
}, { _id: false });

const OptionSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  emoji: { type: String, default: "" },
  label: { type: String, required: true },
  desc:  { type: String, default: "" },
}, { _id: false });

const StepMetaSchema = new mongoose.Schema({
  step:     { type: Number, required: true },
  title:    { type: String, required: true },
  subtitle: { type: String, default: "" },
}, { _id: false });

const TreatmentMapSchema = new mongoose.Schema({
  concernId:  { type: String, required: true },
  treatments: { type: [TreatmentSchema], default: [] },
}, { _id: false });

const QuizConfigSchema = new mongoose.Schema({
  stepMeta:     { type: [StepMetaSchema],     default: [] },
  concerns:     { type: [OptionSchema],        default: [] },
  skinTypes:    { type: [OptionSchema],        default: [] },
  experiences:  { type: [OptionSchema],        default: [] },
  budgets:      { type: [String],              default: [] },
  timelines:    { type: [OptionSchema],        default: [] },
  treatmentMap: { type: [TreatmentMapSchema],  default: [] },
}, { timestamps: true });

export default mongoose.models.QuizConfig ||
  mongoose.model("QuizConfig", QuizConfigSchema);
