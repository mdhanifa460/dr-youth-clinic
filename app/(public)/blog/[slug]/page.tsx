// Generic blog detail — thin wrapper around the shared render/metadata
// logic in blogDetailShared.tsx (also used by /[location]/blog/[slug]).
// See that file's header comment for why the shared logic lives there and
// not in either page.tsx.
import type { Metadata } from 'next';
import { generateBlogDetailMetadata, renderBlogDetailPage } from '../blogDetailShared';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return generateBlogDetailMetadata(params.slug);
}

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  return renderBlogDetailPage(params.slug);
}
