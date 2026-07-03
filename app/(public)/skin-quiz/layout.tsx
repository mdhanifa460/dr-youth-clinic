import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export const metadata: Metadata = {
  title: "AI Skin Quiz – Find Your Perfect Treatment | DR Youth Clinic",
  description:
    "Answer 5 quick questions and get a personalised treatment plan from DR Youth's dermatology experts — free, in 60 seconds. Evidence-based matching across 50,000+ patient outcomes.",
  alternates: {
    canonical: `${SITE_URL}/skin-quiz`,
  },
  openGraph: {
    title: "Discover Your Perfect Skin Treatment | DR Youth Clinic AI Quiz",
    description:
      "Free personalised treatment plan in 60 seconds. Evidence-based matching from expert dermatologists.",
    url: `${SITE_URL}/skin-quiz`,
    siteName: "DR Youth Clinic",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Skin Quiz | DR Youth Clinic",
    description: "5 questions. Personalised treatment plan. Free consultation included.",
  },
};

export default function SkinQuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
