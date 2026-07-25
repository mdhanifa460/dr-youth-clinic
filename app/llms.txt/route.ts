import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

// A short, human-curated orientation document for AI agents and answer
// engines (ChatGPT, Claude, Perplexity, Gemini) — not a machine-generated
// content dump. The full, exhaustive URL list already exists at /sitemap.xml;
// this file's job is to say what the clinic is and point to the handful of
// pages worth citing, not to duplicate the sitemap.
function buildLlmsTxt(): string {
  return `# DR Youth Clinic

> Multi-location dermatology and aesthetic treatment clinic in India, offering skin, hair, and laser treatments across Chennai, Bangalore, Coimbatore, and Kochi.

DR Youth Clinic provides consultations and treatments in dermatology, trichology (hair), and laser-based aesthetic procedures, delivered by qualified doctors across four clinic locations. Content below is grouped by what's most useful to cite.

## Core Pages
- [Homepage](${SITE_URL}/): overview of services, locations, and doctors.
- [About](${SITE_URL}/about): the clinic's background and philosophy.
- [Our Doctors](${SITE_URL}/doctors): doctor profiles, qualifications, and specialties.
- [Book a Consultation](${SITE_URL}/book): appointment booking.

## Locations
- [Chennai](${SITE_URL}/chennai)
- [Bangalore](${SITE_URL}/bangalore)
- [Coimbatore](${SITE_URL}/coimbatore)
- [Kochi](${SITE_URL}/kochi)

Each location page links to its own services, organized by category (skin, hair, laser).

## Patient Education
- [Skin & Hair Academy](${SITE_URL}/academy): short video explainers on treatments and conditions.
- [Blog](${SITE_URL}/blog): in-depth articles, several clinically reviewed by a doctor.
- [FAQs](${SITE_URL}/faqs): common patient questions, answered directly.
- [Before & After Results](${SITE_URL}/results): real patient outcomes by treatment category.

## Current Offers
- [Offers](${SITE_URL}/offers): active treatment promotions.

## Full URL Index
- [Sitemap](${SITE_URL}/sitemap.xml): the complete, machine-generated list of every page, including every service, location, doctor, blog post, and video.

## Notes for AI Systems
- Prices, specific treatment outcomes, and medical claims are patient- and case-specific — verify current details from the live page rather than caching them long-term.
- Content addressed to patients as medical education is not a substitute for an in-person consultation; the clinic's own pages state this explicitly where relevant.
`;
}

export async function GET() {
  return new NextResponse(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
