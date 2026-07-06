import type { AdminRole } from "@/app/lib/permissions";

/** Returns the phone number if the role is permitted, otherwise a masked placeholder. */
export function maskPhone(phone: string, role: AdminRole, allowedRoles: string[]): string {
  if (!phone) return "";
  if (allowedRoles.includes(role)) return phone;
  return phone.slice(0, 3) + "•••••" + phone.slice(-2);
}
