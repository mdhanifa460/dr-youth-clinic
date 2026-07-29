import type { Metadata } from "next";
import { getSiteConfig } from "@/app/lib/siteConfig";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export async function generateMetadata(): Promise<Metadata> {
  const { consultationFree } = await getSiteConfig();

  return {
    title: "Plan My Journey – AI-Personalised Treatment Timeline",
    description:
      `Pick your goal — Hair, Skin, Laser, or Weight Loss — and get an AI-personalised month-by-month treatment journey, matched doctors, real patient results, and a cost plan, all in one place. ${consultationFree ? 'Free consultation included.' : ''}`,
    alternates: {
      canonical: `${SITE_URL}/plan-my-journey`,
    },
    openGraph: {
      title: "Plan My Journey | DR Youth Clinic",
      description: "An AI-personalised treatment journey, matched doctors, and real results — built around your goal.",
      url: `${SITE_URL}/plan-my-journey`,
      siteName: "DR Youth Clinic",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Plan My Journey | DR Youth Clinic",
      description: "Pick your goal, get your personalised treatment journey.",
    },
  };
}

export default function PlanMyJourneyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
