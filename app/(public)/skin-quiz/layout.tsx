import type { Metadata } from "next";
import { getSiteConfig } from "@/app/lib/siteConfig";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export async function generateMetadata(): Promise<Metadata> {
  const { skinQuizFree, consultationFree } = await getSiteConfig();

  return {
    title: "Clinical Intake – Prepare for Your Consultation | DR Youth Clinic",
    description:
      `Answer a few quick questions so DR Youth's dermatology team can prepare for your consultation — ${skinQuizFree ? 'free, ' : ''}in about a minute. Your doctor reviews everything and confirms what's right for you at your visit.`,
    alternates: {
      canonical: `${SITE_URL}/skin-quiz`,
    },
    openGraph: {
      title: "Clinical Intake | DR Youth Clinic",
      description:
        `${skinQuizFree ? 'Free ' : ''}pre-consultation intake in about a minute — helps your doctor prepare before you arrive.`,
      url: `${SITE_URL}/skin-quiz`,
      siteName: "DR Youth Clinic",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Clinical Intake | DR Youth Clinic",
      description: `A few quick questions to prepare your consultation.${consultationFree ? ' Free consultation included.' : ''}`,
    },
  };
}

export default function SkinQuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
