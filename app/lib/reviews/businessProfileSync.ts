import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';
import { GoogleReviewSyncState } from '@/app/models/GoogleReviewSyncState';
import { getAuthenticatedBusinessClient } from '@/app/lib/google/businessProfileOAuth';
import { googleFieldsChanged } from '@/app/lib/reviews/googleReviewSync';
import {
  BRANCHES,
  formatAddress,
  gbpErrorMessage,
  gbpOwnedFields,
  gbpOwnerReply,
  gbpSourceId,
  isGbpSourceId,
  suggestBranch,
  type BusinessLocationLink,
  type GbpReview,
} from '@/app/lib/reviews/businessProfileReviews';

// Network + database side of the Google Business Profile review import.
// Used by the admin "Sync Google" button and the daily cron.

const MAX_PAGES_PER_LISTING = 20; // 20 × 50 = up to 1,000 newest reviews per branch per run

export class GbpError extends Error {}

async function accessToken(): Promise<string> {
  const client = await getAuthenticatedBusinessClient();
  if (!client) throw new GbpError('Google Business Profile is not connected. Click "Connect Google" first.');
  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error('no token');
    return token;
  } catch {
    throw new GbpError('Google sign-in has expired or was removed. Please click "Connect Google" again.');
  }
}

async function gbpGet(url: string, token: string): Promise<any> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new GbpError(gbpErrorMessage(res.status, body));
  return body || {};
}

// Every listing the connected Google account manages, merged with the
// branch matching already saved (new listings get a suggested branch).
export async function fetchBusinessLocations(): Promise<BusinessLocationLink[]> {
  const token = await accessToken();
  const accounts: { name: string }[] = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ pageSize: '20', ...(pageToken ? { pageToken } : {}) });
    const body = await gbpGet(`https://mybusinessaccountmanagement.googleapis.com/v1/accounts?${q}`, token);
    accounts.push(...(body.accounts || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);

  await connectDB();
  const state = await (GoogleReviewSyncState as any).findOne({}).lean();
  const saved = new Map<string, BusinessLocationLink>(
    (state?.businessLocations || []).map((l: BusinessLocationLink) => [`${l.account}/${l.location}`, l])
  );

  const out: BusinessLocationLink[] = [];
  for (const acc of accounts) {
    let locToken = '';
    do {
      const q = new URLSearchParams({ readMask: 'name,title,storefrontAddress', pageSize: '100', ...(locToken ? { pageToken: locToken } : {}) });
      const body = await gbpGet(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?${q}`, token);
      for (const loc of body.locations || []) {
        const address = formatAddress(loc.storefrontAddress);
        const prev = saved.get(`${acc.name}/${loc.name}`);
        out.push({
          account: acc.name,
          location: loc.name,
          title: loc.title || '',
          address,
          branch: prev ? prev.branch : suggestBranch(loc.title || '', address),
          averageRating: prev?.averageRating ?? null,
          totalReviewCount: prev?.totalReviewCount ?? null,
        });
      }
      locToken = body.nextPageToken || '';
    } while (locToken);
  }
  return out;
}

export async function saveBusinessLocations(links: BusinessLocationLink[]): Promise<void> {
  await connectDB();
  const clean = links.map((l) => ({
    account: String(l.account),
    location: String(l.location),
    title: String(l.title || ''),
    address: String(l.address || ''),
    branch: (BRANCHES as readonly string[]).includes(l.branch) ? l.branch : '',
    averageRating: typeof l.averageRating === 'number' ? l.averageRating : null,
    totalReviewCount: typeof l.totalReviewCount === 'number' ? l.totalReviewCount : null,
  }));
  await (GoogleReviewSyncState as any).findOneAndUpdate({}, { $set: { businessLocations: clean } }, { upsert: true });
}

export interface SyncCounts { imported: number; updated: number; unchanged: number; failed: number }

async function upsertReview(r: GbpReview, link: BusinessLocationLink, counts: SyncCounts) {
  const incoming = gbpOwnedFields(r, link);
  // No usable star rating (rare): nothing to show, so skip it quietly.
  if (!incoming.rating) return;
  const sourceId = gbpSourceId(r);
  const reply = gbpOwnerReply(r);
  const now = new Date();
  const meta = { ...incoming.meta, ownerReply: reply?.text || '', ownerReplyAt: reply?.updatedAt || '' };

  let existing = await (Review as any).findOne({ source: 'google', sourceId }).lean();

  // A review imported earlier by the older Places API sync is the same
  // review: adopt it (keeping the admin's settings) instead of duplicating.
  if (!existing && incoming.reviewDate.getTime() > 0) {
    const t = incoming.reviewDate.getTime();
    const legacy = await (Review as any).findOne({
      source: 'google',
      authorName: incoming.authorName,
      reviewDate: { $gte: new Date(t - 120_000), $lte: new Date(t + 120_000) },
    }).lean();
    if (legacy && !isGbpSourceId(legacy.sourceId)) {
      await (Review as any).updateOne({ _id: legacy._id }, { $set: { sourceId } });
      existing = { ...legacy, sourceId };
    }
  }

  if (!existing) {
    await (Review as any).create({
      source: 'google',
      sourceId,
      ...incoming,
      meta,
      syncedAt: now,
      location: link.branch,
      isFeatured: false,
      isVisible: true,
      showOnHomepage: true,
      services: [],
      displayOrder: 0,
      ...(reply ? { replyText: reply.text, replyStatus: 'sent' } : {}),
    });
    counts.imported++;
    return;
  }

  const set: Record<string, unknown> = { syncedAt: now };
  // Fill in the branch only when an admin hasn't set one.
  if (!existing.location) set.location = link.branch;
  // Mirror a reply posted on Google, unless an admin has their own draft.
  const replyChanged = !!reply && existing.replyStatus !== 'draft'
    && (existing.replyText !== reply.text || existing.replyStatus !== 'sent');
  if (replyChanged) { set.replyText = reply!.text; set.replyStatus = 'sent'; }
  const contentChanged = googleFieldsChanged(existing, incoming)
    || existing.meta?.ownerReply !== meta.ownerReply
    || existing.meta?.externalPlaceId !== meta.externalPlaceId;
  if (contentChanged) {
    Object.assign(set, incoming, { meta: { ...(existing.meta || {}), ...meta } });
    if (googleFieldsChanged(existing, incoming)) set.reviewUpdatedAt = now;
  }
  await (Review as any).updateOne({ _id: existing._id }, { $set: set });
  if (contentChanged || set.location || replyChanged) counts.updated++; else counts.unchanged++;
}

// Imports every review for every listing matched to a branch.
export async function runBusinessProfileSync(): Promise<SyncCounts & { errors: string[]; listings: number }> {
  await connectDB();
  const state = await (GoogleReviewSyncState as any).findOne({}).lean();
  const links: BusinessLocationLink[] = (state?.businessLocations || []).filter((l: BusinessLocationLink) => l.branch);
  if (links.length === 0) {
    throw new GbpError('No Google listing is matched to a branch yet. Load the listings and choose a branch for each one.');
  }

  const token = await accessToken();
  const counts: SyncCounts = { imported: 0, updated: 0, unchanged: 0, failed: 0 };
  const errors: string[] = [];
  const stats = new Map<string, { averageRating: number | null; totalReviewCount: number | null }>();

  for (const link of links) {
    try {
      let pageToken = '';
      let pages = 0;
      do {
        const q = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc', ...(pageToken ? { pageToken } : {}) });
        const body = await gbpGet(`https://mybusiness.googleapis.com/v4/${link.account}/${link.location}/reviews?${q}`, token);
        if (pages === 0) {
          stats.set(`${link.account}/${link.location}`, {
            averageRating: typeof body.averageRating === 'number' ? body.averageRating : null,
            totalReviewCount: typeof body.totalReviewCount === 'number' ? body.totalReviewCount : null,
          });
        }
        for (const r of (body.reviews || []) as GbpReview[]) {
          try { await upsertReview(r, link, counts); }
          catch (e: any) { counts.failed++; if (errors.length < 5) errors.push(e?.message || 'Could not save a review'); }
        }
        pageToken = body.nextPageToken || '';
        pages++;
      } while (pageToken && pages < MAX_PAGES_PER_LISTING);
    } catch (e: any) {
      if (errors.length < 5) errors.push(`${link.title || link.branch}: ${e?.message || 'failed'}`);
      // The same Google error (e.g. access not approved) will repeat for every listing.
      if (e instanceof GbpError && /Connect Google|not been approved|not turned on/.test(e.message)) break;
    }
  }

  // Keep each listing's Google rating/count for admin reference.
  const allLinks: BusinessLocationLink[] = (state?.businessLocations || []).map((l: BusinessLocationLink) => ({
    ...l, ...(stats.get(`${l.account}/${l.location}`) || {}),
  }));
  const ok = errors.length === 0 || counts.imported + counts.updated + counts.unchanged > 0;
  await (GoogleReviewSyncState as any).findOneAndUpdate({}, {
    $set: {
      businessLocations: allLinks,
      lastSyncAt: new Date(),
      lastSyncStatus: ok ? 'success' : 'error',
      lastSyncCounts: counts,
      lastSyncError: errors.join('; '),
      lastSyncSource: 'business_profile',
    },
  }, { upsert: true });

  return { ...counts, errors, listings: links.length };
}
