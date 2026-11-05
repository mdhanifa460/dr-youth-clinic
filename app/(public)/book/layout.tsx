import { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export const metadata: Metadata = {
  title: "Book Appointment",
  description:
    "Request a consultation at DR Youth Clinic in Chennai, Bangalore, Coimbatore or Kochi. Our team will contact you to confirm the time.",
  alternates: {
    canonical: `${SITE_URL}/book`,
  },
  openGraph: {
    title: "Book Your Consultation | DR Youth Clinic",
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
