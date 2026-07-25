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
export const bookingSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100, "Name is too long"),
  phone: z.string().trim().min(7, "Phone number is required").max(20, "Phone number is too long"),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  service: z.string().trim().min(1, "Select a service").max(200),
  location: z.string().trim().min(1, "Select a location").max(100),
  date: z.string().trim().min(1, "Select a date").max(40),
  time: z.string().trim().min(1, "Select a time").max(40),
  concern: z.string().trim().max(1000).optional().or(z.literal("")),
  promoCode: z.string().trim().max(50).optional().or(z.literal("")),
  promoDiscount: z.number().min(0).max(100).optional(),
  source: z.string().trim().max(50).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;