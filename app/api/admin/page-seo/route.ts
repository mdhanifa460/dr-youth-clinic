import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { PageSeo } from '@/app/models/PageSeo';

const PAGE_DEFAULTS = [
  {
    pageKey: 'home',
    pageLabel: 'Homepage',
    metaTitle: 'DR Youth Clinic – Advanced Skin & Aesthetic Care',
    metaDescription: 'Trusted by 25,000+ patients across India. Expert dermatology, hair restoration & aesthetic treatments at DR Youth Clinic.',
    keywords: ['dermatologist', 'skin clinic', 'hair treatment', 'dr youth clinic'],
  },
  {
    pageKey: 'services',
    pageLabel: 'Services Listing',
    metaTitle: 'Our Services | DR Youth Clinic',
    metaDescription: 'Explore our full range of skin, hair and laser treatments at DR Youth Clinic.',
    keywords: ['skin treatment', 'hair loss', 'laser therapy', 'aesthetic clinic'],
  },
  {
    pageKey: 'about',
    pageLabel: 'About Us',
    metaTitle: 'About DR Youth Clinic | Expert Dermatologists',
    metaDescription: "India's trusted skin and hair care specialists with 22+ years of clinical excellence.",
    keywords: ['about dr youth', 'dermatology clinic india', 'aesthetic specialists'],
  },
  {
    pageKey: 'contact',
    pageLabel: 'Contact Us',
    metaTitle: 'Contact DR Youth Clinic | Book Appointment',
    metaDescription: 'Get in touch with DR Youth Clinic. Book your skin & hair consultation today.',
    keywords: ['contact dr youth', 'book appointment', 'skin clinic appointment'],
  },
  {
    pageKey: 'book',
    pageLabel: 'Book Appointment',
    metaTitle: 'Book a Consultation | DR Youth Clinic',
    metaDescription: 'Schedule your consultation with DR Youth expert doctors online. Fast, easy, personalised.',
    keywords: ['book skin clinic', 'online consultation dermatologist', 'book hair treatment'],
  },
];

export async function GET() {
  try {
    await connectDB();
    const dbEntries = await PageSeo.find().lean();
    const dbMap = new Map(dbEntries.map((e: any) => [e.pageKey, e]));

    const result = PAGE_DEFAULTS.map((def) => ({
      ...def,
      ...(dbMap.get(def.pageKey) ?? {}),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch page SEO' },
      { status: 500 }
    );
  }
}
