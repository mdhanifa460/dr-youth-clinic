import mongoose, { Schema, Document } from "mongoose";
import {
  CUSTOM_EVENT_TRIGGER_TYPES,
  CUSTOM_EVENT_PARAM_SOURCES,
  type CustomEventTriggerType,
  type CustomEventParamSource,
} from "@/app/lib/analytics/customEventOptions";

// Admin-configurable analytics tracking, modeled directly on
// app/models/AnimationAsset.ts's shape — a dedicated top-level collection
// with its own CRUD admin pages and its own permission module, because
// (unlike a thin Settings-embedded array such as automationRules or
// leadQualification.scoringRules) a Custom Event needs independent
// lifecycle (enabled/disabled, audit) of its own.
//
// `name` is the actual event name pushed to the dataLayer — required,
// unique, and treated as IMMUTABLE after creation (enforced in the PUT
// route, not here — Mongoose has no clean "field is writable only on
// insert" primitive), because renaming a live event would silently orphan
// any GTM trigger already built against the old name. Also checked
// against the Predefined Event Registry at create time so an admin can
// never shadow/collide with a protected event name like booking_confirmed.
export interface ICustomAnalyticsEvent extends Document {
  name: string;
  displayName: string;
  description: string;
  triggerType: CustomEventTriggerType;
  // Exact-id-attribute match only (see CustomEventListener.tsx) — required
  // for button_click/cta_click/element_visible, ignored for page_view.
  elementId: string;
  // Only meaningful for triggerType "page_view" — exact path, or '' = every page.
  pagePath: string;
  parameters: { name: string; source: CustomEventParamSource; value: string }[];
  enabled: boolean;
  // See the Key Events admin page — merges is_key_event:true into this
  // event's dataLayer push when true. Only meaningful for Custom Events;
  // predefined events use a separate Settings-level flag (checklist-only
  // in Phase 1, see Settings.analyticsEventManager.keyEventNames) since
  // their live call sites aren't touched by this feature.
  isKeyEvent: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomAnalyticsEventSchema = new Schema<ICustomAnalyticsEvent>(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      unique: true,
      trim: true,
      lowercase: true,
      // lowercase_snake_case: starts with a letter, then letters/digits/underscores.
      match: [/^[a-z][a-z0-9_]*$/, "Event name must be lowercase_snake_case (e.g. campaign_banner_click)"],
    },
    displayName: { type: String, required: [true, "Display name is required"], trim: true },
    description: { type: String, default: "" },
    triggerType: { type: String, enum: [...CUSTOM_EVENT_TRIGGER_TYPES], required: true },
    elementId: { type: String, default: "" },
    pagePath: { type: String, default: "" },
    parameters: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          source: { type: String, enum: [...CUSTOM_EVENT_PARAM_SOURCES], default: "static" },
          value: { type: String, default: "" },
        },
      ],
      default: [],
    },
    enabled: { type: Boolean, default: false },
    isKeyEvent: { type: Boolean, default: false },
    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

CustomAnalyticsEventSchema.index({ enabled: 1, triggerType: 1 });

export const CustomAnalyticsEvent =
  mongoose.models.CustomAnalyticsEvent ||
  mongoose.model<ICustomAnalyticsEvent>("CustomAnalyticsEvent", CustomAnalyticsEventSchema);
