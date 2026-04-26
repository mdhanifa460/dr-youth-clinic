import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

// 👇 your fonts (correct)
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-headline",
  subsets: ["latin"],
});

// 👇 improve metadata (better for SEO)
export const metadata: Metadata = {
  title: {
    default: "DR Youth Clinic",
    template: "%s | DR Youth Clinic",
  },
  description:
    "Premium dermatology and hair treatment clinic. Book consultations online.",
};

// 👇 import layout components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#f6faff]">

      

        {/* 🟢 MAIN CONTENT (IMPORTANT) */}
        <main className="flex-1">
          {children}
        </main>



      </body>
    </html>
  );
}