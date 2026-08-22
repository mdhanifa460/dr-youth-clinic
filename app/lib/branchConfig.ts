import { connectDB } from '@/app/lib/mongodb';
import { LocationContent, type IBookingRules, type IOperatingHour, type IHoliday, type ISlotConfig } from '@/app/models/LocationContent';
import { getSettings } from '@/app/models/Settings';

export interface EffectiveBranchConfig {
  // Scoped to just the three original fields this object literal has
  // always built — the four new Booking Capacity fields below are
  // resolved as their own top-level properties instead (matching how
  // every caller already reads them, e.g. config.dailyAppointmentCapacity,
  // not config.bookingRules.dailyAppointmentCapacity).
  bookingRules: Required<Pick<IBookingRules, 'consultationDuration' | 'consultationFee' | 'requirePhone'>>;
  operatingHours: IOperatingHour[];
  holidays: IHoliday[];
  slotConfig?: ISlotConfig;
  languages: string[];
  whatsappSenderPhoneNumberId?: string;
  // Booking Capacity & Availability — resolved the same way every other
  // field in this interface already is (branch override ?? global default
  // ?? hardcoded fallback). See app/lib/bookingCapacity.ts for what reads
  // these. `dailyAppointmentCapacity`/`advanceBookingDays` stay `null` for
  // "unlimited" all the way through this merge — never coerced to a number.
  dailyAppointmentCapacity: number | null;
  bookingEnabled: boolean;
  sameDayBookingEnabled: boolean;
  advanceBookingDays: number | null;
  // IANA timezone this branch's "today"/midnight math runs in — see
  // app/lib/branchTimezone.ts. Always resolves to a real string (defaults
  // to Asia/Kolkata), never undefined.
  timezone: string;
}

// The single place that resolves "what actually applies to booking X at
// branch Y" — every field on LocationContent.clinicInfo.bookingRules is
// optional and falls back to the global Settings.booking value when unset,
// so a branch with no overrides configured behaves identically to today
// (one global rule set for every city). Callers should use this instead of
// reading LocationContent or Settings.booking directly for anything
// booking-rule-related.
export async function getEffectiveBranchConfig(location: string): Promise<EffectiveBranchConfig> {
  await connectDB();
  const [settings, content] = await Promise.all([
    getSettings(),
    (LocationContent as any).findOne({ location: location.toLowerCase() }).lean(),
  ]);

  const branchRules = content?.clinicInfo?.bookingRules || {};
  return {
    bookingRules: {
      consultationDuration: branchRules.consultationDuration ?? settings.booking?.consultationDuration ?? 30,
      consultationFee: branchRules.consultationFee ?? settings.booking?.consultationFee ?? 500,
      requirePhone: branchRules.requirePhone ?? settings.booking?.requirePhone ?? true,
    },
    operatingHours: content?.clinicInfo?.operatingHours || [],
    holidays: content?.clinicInfo?.holidays || [],
    slotConfig: content?.clinicInfo?.slotConfig,
    languages: content?.clinicInfo?.languages || [],
    whatsappSenderPhoneNumberId: content?.clinicInfo?.whatsappSenderPhoneNumberId || undefined,
    dailyAppointmentCapacity: branchRules.dailyAppointmentCapacity ?? settings.booking?.dailyAppointmentCapacity ?? null,
    bookingEnabled: branchRules.bookingEnabled ?? settings.booking?.bookingEnabled ?? true,
    sameDayBookingEnabled: branchRules.sameDayBookingEnabled ?? settings.booking?.sameDayBookingEnabled ?? true,
    advanceBookingDays: branchRules.advanceBookingDays ?? settings.booking?.advanceBookingDays ?? null,
    timezone: content?.clinicInfo?.timezone || 'Asia/Kolkata',
  };
}
