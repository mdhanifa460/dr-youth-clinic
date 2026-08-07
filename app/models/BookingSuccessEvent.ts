import mongoose, { Schema, Document } from 'mongoose';

// One row per tracked interaction on /book/success/[bookingId] — kept
// separate from Booking itself (a high-write, append-only log vs. a
// low-write patient record) so this never risks the Booking document's
// own write path. Feeds the aggregate counts shown in the admin CMS
// editor for this page (app/admin/booking-success), the "Everything
// should be configurable... Track analytics" requirement — a real,
// persisted count an admin can see in-app, not just an external pixel.
export type BookingSuccessEventType =
  | 'page_view'
  | 'cta_click_calendar'
  | 'cta_click_directions'
  | 'cta_click_whatsapp'
  | 'cta_click_call'
  | 'cta_click_portal'
  | 'cta_click_bookAnother'
  | 'checklist_ai_assessment_click'
  | 'checklist_upload_reports_click';

export interface IBookingSuccessEvent extends Document {
  bookingId: string;
  eventType: BookingSuccessEventType;
  location: string;
  createdAt: Date;
}

const BookingSuccessEventSchema = new Schema<IBookingSuccessEvent>(
  {
    bookingId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'page_view',
        'cta_click_calendar',
        'cta_click_directions',
        'cta_click_whatsapp',
        'cta_click_call',
        'cta_click_portal',
        'cta_click_bookAnother',
        'checklist_ai_assessment_click',
        'checklist_upload_reports_click',
      ],
      index: true,
    },
    location: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BookingSuccessEventSchema.index({ eventType: 1, createdAt: -1 });

export const BookingSuccessEvent =
  mongoose.models.BookingSuccessEvent ||
  mongoose.model<IBookingSuccessEvent>('BookingSuccessEvent', BookingSuccessEventSchema);
