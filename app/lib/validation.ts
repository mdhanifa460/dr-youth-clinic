import * as z from "zod";

export const formSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone"),
  service: z.string().min(1, "Select service"),
  location: z.string().min(1, "Select location"),
  date: z.string().min(1, "Select date"),
  time: z.string().min(1, "Select time"),
});

export type FormData = z.infer<typeof formSchema>;

// Bounds match what the booking form actually collects — short identifiers
// (service/location/date/time) get a generous but finite max so a malformed
// or abusive payload can't inflate the WhatsApp notification text or the
// stored Booking document; free-text fields (concern) get a longer cap.
//
// date/time are optional, matching Booking.ts's own schema (both default to
// "") — not every entry point collects a specific slot. The homepage's quick
// ConsultationFormBar, for one, is a "leave your number, we'll call you"
// lead form by design, with no date/time fields in its UI at all.
export const bookingSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100, "Name is too long"),
  phone: z.string().trim().min(7, "Phone number is required").max(20, "Phone number is too long"),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  service: z.string().trim().min(1, "Select a service").max(200),
  location: z.string().trim().min(1, "Select a location").max(100),
  date: z.string().trim().max(40).optional().or(z.literal("")),
  time: z.string().trim().max(40).optional().or(z.literal("")),
  concern: z.string().trim().max(1000).optional().or(z.literal("")),
  promoCode: z.string().trim().max(50).optional().or(z.literal("")),
  promoDiscount: z.number().min(0).max(100).optional(),
  source: z.string().trim().max(50).optional(),
  // Configurable-booking-page additions — all optional, so every existing
  // caller (the 4-step /book form, the homepage quick form, the AI chat
  // widget's booking form) keeps working unchanged without passing them.
  doctorId: z.string().trim().max(50).optional().or(z.literal("")),
  consultationMode: z.enum(["in_clinic", "video", "phone"]).optional(),
  language: z.string().trim().max(50).optional().or(z.literal("")),
  appointmentType: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingSchema>;