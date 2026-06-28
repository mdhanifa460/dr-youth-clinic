import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST() {
  try {
    // Clear unstable_cache entries for TopBar + Footer (both tagged 'homepage-layout')
    revalidateTag('homepage-layout');

    // Clear ISR cache for all public pages
    revalidatePath('/');
    revalidatePath('/chennai');
    revalidatePath('/bangalore');
    revalidatePath('/coimbatore');
    revalidatePath('/kochi');

    return NextResponse.json({ success: true, revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
