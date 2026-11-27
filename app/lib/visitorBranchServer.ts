import { cookies, headers } from 'next/headers';
import { connectDB } from '@/app/lib/mongodb';
import { LocationContent } from '@/app/models/LocationContent';
import { locations } from '@/app/data/locations';
import { getLocationFromIpHeaders } from '@/app/lib/ipLocation';

// Server-side version of the branch the main site's top bar, footer and
// WhatsApp button follow: the saved preferred_location cookie (tapped clinic,
// GPS, city page or an earlier IP guess), else an IP guess for a first visit.
// Only for dynamic pages; reading cookies/headers opts a page out of caching.
export async function getVisitorBranch(): Promise<string | null> {
  const saved = ((await cookies()).get('preferred_location')?.value || '').toLowerCase();
  if (locations[saved]) return saved;
  const guess = getLocationFromIpHeaders(await headers());
  return guess && locations[guess] ? guess : null;
}

// The branch's public phone and WhatsApp, as set in Admin → Locations (same
// source as /api/branch-contact and /api/branch-whatsapp). Empty strings when
// the branch hasn't set one, so the caller keeps its own number.
export async function getBranchNumbers(location: string): Promise<{ phone: string; whatsapp: string }> {
  try {
    await connectDB();
    const content = await (LocationContent as any)
      .findOne({ location })
      .select('clinicInfo.phone clinicInfo.publicWhatsApp')
      .lean();
    return {
      phone: content?.clinicInfo?.phone || '',
      whatsapp: content?.clinicInfo?.publicWhatsApp || '',
    };
  } catch {
    return { phone: '', whatsapp: '' };
  }
}
