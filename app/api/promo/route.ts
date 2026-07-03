import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { getSettings } from '@/app/models/Settings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim();
  if (!code) {
    return NextResponse.json({ valid: false, message: 'No code provided' }, { status: 400 });
  }

  try {
    await connectDB();
    const settings = await getSettings();
    const promoCode = (settings.promotions?.promoCode || '').toUpperCase().trim();
    const discountPercent = settings.promotions?.promoDiscount ?? 0;

    if (!promoCode || promoCode !== code) {
      return NextResponse.json({ valid: false, message: 'Invalid promo code' });
    }

    return NextResponse.json({ valid: true, discountPercent, message: `${discountPercent}% discount applied!` });
  } catch {
    return NextResponse.json({ valid: false, message: 'Could not validate code' }, { status: 500 });
  }
}
