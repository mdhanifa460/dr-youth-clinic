import { connectDB } from '@/app/lib/mongodb';
import { LocationContent, type IBookingRules, type IOperatingHour, type IHoliday, type ISlotConfig } from '@/app/models/LocationContent';
import { getSettings } from '@/app/models/Settings';

export interface EffectiveBranchConfig {
  bookingRules: Required<IBookingRules>;
  operatingHours: IOperatingHour[];
  holidays: IHoliday[];
  slotConfig?: ISlotConfig;
  languages: string[];
  whatsappSenderPhoneNumberId?: string;
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
  };
}
