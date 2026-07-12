import type { Metadata } from "next";
import { getSiteConfig } from "@/app/lib/siteConfig";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export async function generateMetadata(): Promise<Metadata> {
  const { skinQuizFree, consultationFree } = await getSiteConfig();

  return {
    title: "AI Skin & Hair Assessment – Find Your Perfect Treatment | DR Youth Clinic",
    description:
      `Answer a few quick questions and get a personalised treatment plan from DR Youth's dermatology experts — ${skinQuizFree ? 'free, ' : ''}in 60 seconds. Evidence-based matching across 50,000+ patient outcomes.`,
    alternates: {
      canonical: `${SITE_URL}/skin-quiz`,
    },
    openGraph: {
      title: "Discover Your Perfect Skin Treatment | DR Youth Clinic AI Assessment",
      description:
        `${skinQuizFree ? 'Free personalised' : 'Personalised'} treatment plan in 60 seconds. Evidence-based matching from expert dermatologists.`,
      url: `${SITE_URL}/skin-quiz`,
      siteName: "DR Youth Clinic",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "AI Skin & Hair Assessment | DR Youth Clinic",
      description: `A few quick questions. Personalised treatment plan.${consultationFree ? ' Free consultation included.' : ''}`,
    },
  };
}

export default function SkinQuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
