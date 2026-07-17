import type { BannerDoc } from "@/app/lib/banners/types";
import PremiumHeroBanner from "@/app/components/banners/templates/PremiumHeroBanner";
import OfferBanner from "@/app/components/banners/templates/OfferBanner";
import BeforeAfterBanner from "@/app/components/banners/templates/BeforeAfterBanner";
import ServiceBanner from "@/app/components/banners/templates/ServiceBanner";
import DoctorBanner from "@/app/components/banners/templates/DoctorBanner";
import ClinicExperienceBanner from "@/app/components/banners/templates/ClinicExperienceBanner";
import AnimatedBannerWrapper from "@/app/components/banners/AnimatedBannerWrapper";

// Dispatcher — switches on templateType, wraps whichever template in one
// shared entrance-animation wrapper so animation behavior is centralized
// instead of duplicated per template. Returns null when there's no banner;
// the caller (a page component) decides what fallback to render instead.
export default function BannerRenderer({ banner }: { banner: BannerDoc | null }) {
  if (!banner) return null;

  const Template = {
    "premium-hero": PremiumHeroBanner,
    offer: OfferBanner,
    "before-after": BeforeAfterBanner,
    service: ServiceBanner,
    doctor: DoctorBanner,
    "clinic-experience": ClinicExperienceBanner,
  }[banner.templateType];

  if (!Template) return null;

  return (
    <AnimatedBannerWrapper>
      <Template banner={banner} />
    </AnimatedBannerWrapper>
  );
}
