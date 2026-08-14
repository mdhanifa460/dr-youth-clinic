import mongoose, { Schema, Document } from 'mongoose';

// One row per Flash Offer Popup interaction (view/close/CTA-click) — kept
// separate from Banner itself, same "high-write append-only log vs.
// low-write CMS record" reasoning as BookingSuccessEvent.ts, which this
// model is a direct structural copy of.
export type BannerPopupEventType = 'flash_offer_view' | 'flash_offer_close' | 'flash_offer_cta_click';

export interface IBannerPopupEvent extends Document {
  bannerId: string;
  eventType: BannerPopupEventType;
  // Headline snapshot at event time — a banner can be edited/deleted
  // later, so this preserves what the visitor actually saw rather than
  // requiring a join back to a Banner document that may no longer exist
  // or may since have different content.
  offerName: string;
  // Fixed literal today (only one popup surface exists) — forward
  // compatible if a second popup surface (e.g. exit-intent) is ever added.
  presentationMode: 'flash-popup';
  page: string;
  source: string;
  createdAt: Date;
}

const BannerPopupEventSchema = new Schema<IBannerPopupEvent>(
  {
    bannerId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: ['flash_offer_view', 'flash_offer_close', 'flash_offer_cta_click'],
      index: true,
    },
    offerName: { type: String, default: '' },
    presentationMode: { type: String, default: 'flash-popup' },
    page: { type: String, default: '' },
    source: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BannerPopupEventSchema.index({ eventType: 1, createdAt: -1 });

export const BannerPopupEvent =
  mongoose.models.BannerPopupEvent ||
  mongoose.model<IBannerPopupEvent>('BannerPopupEvent', BannerPopupEventSchema);
