import { LocationContent } from "@/app/models/LocationContent";
import { normalizePhone as formatPhone } from "@/app/lib/phone";

// Resolves which WhatsApp number gets a "new lead/booking" alert for a given
// location: per-location whatsappNotifyNumber -> per-location public phone
// -> global CLINIC_PHONE fallback, so a location without a configured
// number still works exactly as before. Shared by app/api/booking/route.ts
// and app/api/leads/route.ts so the two stay consistent instead of one
// silently drifting to a flat global-only lookup (which is what leads/route.ts
// did before this fix — it always notified the single global CLINIC_PHONE
// regardless of which clinic branch the patient actually picked).
export async function getClinicNotifyNumber(location: string | undefined): Promise<string | undefined> {
  try {
    const lc = await (LocationContent as any)
      .findOne({ location: (location || "").toLowerCase() })
      .select("clinicInfo.phone clinicInfo.whatsappNotifyNumber")
      .lean();
    const raw = lc?.clinicInfo?.whatsappNotifyNumber || lc?.clinicInfo?.phone;
    return raw ? formatPhone(raw) : process.env.CLINIC_PHONE;
  } catch {
    return process.env.CLINIC_PHONE;
  }
}
