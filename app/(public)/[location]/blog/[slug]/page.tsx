// Location-targeted blog detail — thin wrapper around the same shared
// render/metadata logic the generic /blog/[slug] route uses
// (blogDetailShared.tsx), so there is exactly one place that knows how to
// render a blog post. `renderBlogDetailPage` 404s here if the post doesn't
// actually target this city (isBlogAtCity), so this URL only ever exists
// for posts an admin explicitly opted in via targetLocations — it never
// makes every post reachable under every city by default.
import type { Metadata } from 'next';
import { generateBlogDetailMetadata, renderBlogDetailPage } from '../../../blog/blogDetailShared';

interface PageProps {
  params: { location: string; slug: string };
}

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return generateBlogDetailMetadata(params.slug, params.location);
}

export default async function LocationBlogDetailPage({ params }: PageProps) {
  return renderBlogDetailPage(params.slug, params.location);
}
