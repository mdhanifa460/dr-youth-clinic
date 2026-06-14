import { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dryouthclinic.co.in";

export const metadata: Metadata = {
  title: "Book Appointment | DR Youth Clinic",
  description:
    "Schedule your dermatology consultation at DR Youth Clinic. Easy online booking with expert dermatologists at multiple locations.",
  alternates: {
    canonical: `${SITE_URL}/book`,
  },
  openGraph: {
    title: "Book Your Dermatology Appointment | DR Youth Clinic",
    description: "Quick and easy online booking for skin, hair, and laser treatments",
    url: `${SITE_URL}/book`,
    siteName: "DR Youth Clinic",
    type: "website",
  },
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
