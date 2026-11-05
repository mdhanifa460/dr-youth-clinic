// Generic blog detail — thin wrapper around the shared render/metadata
// logic in blogDetailShared.tsx (also used by /[location]/blog/[slug]).
// See that file's header comment for why the shared logic lives there and
// not in either page.tsx.
import type { Metadata } from 'next';
import { generateBlogDetailMetadata, renderBlogDetailPage, getBlogStaticParams } from '../blogDetailShared';

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getBlogStaticParams()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  return generateBlogDetailMetadata(params.slug);
}

export default async function BlogDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  return renderBlogDetailPage(params.slug);
}
