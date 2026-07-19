import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { PageSeo } from '@/app/models/PageSeo';
import { requirePermission } from '@/app/lib/adminAuth';

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
    // No "| DR Youth Clinic" suffix — the root layout's title template
    // appends it automatically to every page; only the 'home' pageKey is
    // special-cased to bypass the template (see app/(public)/page.tsx).
    metaTitle: 'Our Services',
    metaDescription: 'Explore our full range of skin, hair and laser treatments at DR Youth Clinic.',
    keywords: ['skin treatment', 'hair loss', 'laser therapy', 'aesthetic clinic'],
  },
  {
    pageKey: 'about',
    pageLabel: 'About Us',
    metaTitle: 'About Us — Expert Dermatologists',
    metaDescription: "India's trusted skin and hair care specialists with 22+ years of clinical excellence.",
    keywords: ['about dr youth', 'dermatology clinic india', 'aesthetic specialists'],
  },
  {
    pageKey: 'contact',
    pageLabel: 'Contact Us',
    metaTitle: 'Contact Us — Book Appointment',
    metaDescription: 'Get in touch with DR Youth Clinic. Book your skin & hair consultation today.',
    keywords: ['contact dr youth', 'book appointment', 'skin clinic appointment'],
  },
  {
    pageKey: 'book',
    pageLabel: 'Book Appointment',
    metaTitle: 'Book a Consultation',
    metaDescription: 'Schedule your consultation with DR Youth expert doctors online. Fast, easy, personalised.',
    keywords: ['book skin clinic', 'online consultation dermatologist', 'book hair treatment'],
  },
];

export async function GET() {
  const denied = await requirePermission('seo', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const dbEntries = await PageSeo.find({} as any).lean();
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
