import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';
import { GoogleReviewSyncState } from '@/app/models/GoogleReviewSyncState';
import { requirePermission } from '@/app/lib/adminAuth';
import {
  buildSourceId,
  googleOwnedFields,
  googleFieldsChanged,
  googleStatusMessage,
  cooldownRemainingMs,
} from '@/app/lib/reviews/googleReviewSync';

// Minimum time between two real sync attempts (i.e. two actual calls to
// Google's API) — a plain spam/accidental-double-trigger guard, not a
// precision rate limiter. Checked BEFORE calling Google at all, so a
// blocked attempt costs zero API calls and never touches
// GoogleReviewSyncState — only an attempt that actually reached Google
// (success or failure) updates lastSyncAt, so repeatedly clicking during
// the cooldown window doesn't itself extend the wait.
const COOLDOWN_MS = 60_000;

async function recordSyncState(
  status: 'success' | 'error',
  counts: { imported: number; updated: number; unchanged: number; failed: number },
  error: string
) {
  await (GoogleReviewSyncState as any).findOneAndUpdate(
    {},
    { $set: { lastSyncAt: new Date(), lastSyncStatus: status, lastSyncCounts: counts, lastSyncError: error } },
    { upsert: true }
  );
}

export async function POST() {
  const denied = await requirePermission('reviews', 'full');
  if (denied) return denied;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Add GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID to your .env.local file to enable Google Reviews sync.',
      },
      { status: 400 }
    );
  }

  await connectDB();

  const state = await (GoogleReviewSyncState as any).findOne({}).lean();
  const remainingMs = cooldownRemainingMs(state?.lastSyncAt ?? null, COOLDOWN_MS);
  if (remainingMs > 0) {
    const waitSeconds = Math.ceil(remainingMs / 1000);
    return NextResponse.json(
      { success: false, message: `Please wait ${waitSeconds}s before syncing again.`, cooldown: true, waitSeconds },
      { status: 429 }
    );
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}&language=en&reviews_sort=newest`,
      { cache: 'no-store' }
    );
    const json = await res.json().catch(() => null);

    if (!json) {
      const msg = 'Google returned an invalid (non-JSON) response.';
      await recordSyncState('error', { imported: 0, updated: 0, unchanged: 0, failed: 0 }, msg);
      return NextResponse.json({ success: false, message: msg }, { status: 502 });
    }

    if (json.status !== 'OK') {
      const msg = googleStatusMessage(json.status, json.error_message);
      await recordSyncState('error', { imported: 0, updated: 0, unchanged: 0, failed: 0 }, msg);
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    const googleReviews: any[] = json.result?.reviews || [];
    if (googleReviews.length === 0) {
      await recordSyncState('success', { imported: 0, updated: 0, unchanged: 0, failed: 0 }, '');
      return NextResponse.json({
        success: true, imported: 0, updated: 0, unchanged: 0, failed: 0,
        message: 'No reviews found on this Place ID.',
      });
    }

    let imported = 0;
    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const errors: string[] = [];

    // Per-review try/catch — one malformed row from Google must never
    // abort the rest of the batch, and never touches any other review.
    for (const gr of googleReviews) {
      try {
        const sourceId = buildSourceId(gr);
        const incoming = googleOwnedFields(gr, placeId);
        const existing = await (Review as any).findOne({ source: 'google', sourceId }).lean();

        if (!existing) {
          await (Review as any).create({
            source: 'google',
            sourceId,
            ...incoming,
            syncedAt: new Date(),
            // Schema defaults, explicit — no rating-based guessing at
            // whether a brand-new Google review should show on the
            // homepage; that's an admin call, same as any other review.
            isFeatured: false,
            isVisible: true,
            showOnHomepage: true,
            services: [],
            location: '',
            displayOrder: 0,
          });
          imported++;
          continue;
        }

        if (!googleFieldsChanged(existing, incoming)) {
          unchanged++;
          continue;
        }

        // Update ONLY Google-owned content — isVisible/showOnHomepage/
        // isFeatured/location/services/displayOrder are never in this
        // $set, so an admin's own presentation choices survive untouched.
        await (Review as any).updateOne(
          { source: 'google', sourceId },
          { $set: { ...incoming, syncedAt: new Date() } }
        );
        updated++;
      } catch (rowErr: any) {
        failed++;
        if (errors.length < 5) errors.push(rowErr?.message || 'Unknown error processing a review');
      }
    }

    const counts = { imported, updated, unchanged, failed };
    await recordSyncState(failed > 0 && imported === 0 && updated === 0 ? 'error' : 'success', counts, errors.join('; '));

    return NextResponse.json({ success: true, ...counts, errors: errors.length ? errors : undefined });
  } catch (err: any) {
    const msg = err?.message || 'Network error calling Google Places API';
    await recordSyncState('error', { imported: 0, updated: 0, unchanged: 0, failed: 0 }, msg).catch(() => {});
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
