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