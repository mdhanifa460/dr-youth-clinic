import type { AdminRole } from "@/app/lib/permissions";

/** Returns the phone number if masking is disabled or the role is permitted, otherwise a masked placeholder. */
export function maskPhone(phone: string, role: AdminRole, allowedRoles: string[], enabled: boolean = true): string {
  if (!phone) return "";
  if (!enabled) return phone;
  if (allowedRoles.includes(role)) return phone;
  return phone.slice(0, 3) + "•••••" + phone.slice(-2);
}
