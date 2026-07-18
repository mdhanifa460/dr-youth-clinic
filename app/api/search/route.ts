import { NextRequest, NextResponse } from 'next/server';
import { searchServices, searchDoctors } from '@/app/lib/rag/SearchService';

// 'location' and 'blog' are intentionally not supported here — see the
// comment in SearchService.ts on the Atlas Search index-count budget for
// this cluster.
const SEARCHERS = {
  service: searchServices,
  doctor: searchDoctors,
} as const;

type SearchType = keyof typeof SEARCHERS;

// Public, read-only Atlas Search endpoint — additive alongside the existing
// admin ⌘K palette (app/api/admin/search/route.ts) and the blog page's
// client-side filter, neither of which this touches or replaces.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type') as SearchType | null;

  if (!q || q.length < 2) {
    return NextResponse.json({ success: false, message: 'Query must be at least 2 characters' }, { status: 400 });
  }
  if (!type || !(type in SEARCHERS)) {
    return NextResponse.json({ success: false, message: 'type must be one of: service, doctor' }, { status: 400 });
  }

  try {
    const data = await SEARCHERS[type](q);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Search failed' }, { status: 500 });
  }
}
