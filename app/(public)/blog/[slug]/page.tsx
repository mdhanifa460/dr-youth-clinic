import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, Tag } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { markdownToHtml, extractHeadings } from '@/app/lib/blogMarkdown';
import ReadingProgress from './ReadingProgress';
import ArticleSidebar from './ArticleSidebar';
import { getSiteConfig } from '@/app/lib/siteConfig';
import BlockRenderer from '@/app/components/contentblocks/BlockRenderer';
import { extractHeadingsFromBlocks } from '@/app/lib/contentBlocks/types';
import { resolveRelatedLinks, resolveReferencedDoctors, resolveReferencedVideos } from '@/app/lib/contentBlocks/relatedContent';

async function getPost(slug: string) {
  try {
    await connectDB();
    const post = await Blog.findOne({ slug, active: true } as any).lean();
    if (!post) return null;
    return JSON.parse(JSON.stringify(post));
  } catch { return null; }
}

async function getRelatedPosts(slug: string, category: string) {
  try {
    await connectDB();
    const posts = await Blog.find({ slug: { $ne: slug }, active: true, category } as any)
      .sort({ publishedAt: -1 }).limit(3).lean();
    if (posts.length < 3) {
      const more = await Blog.find({ slug: { $ne: slug }, active: true } as any)
        .sort({ publishedAt: -1 }).limit(3 - posts.length).lean();
      return JSON.parse(JSON.stringify([...posts, ...more]));
    }
    return JSON.parse(JSON.stringify(posts));
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Post Not Found | DR Youth Clinic' };
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
  return {
    title: `${post.title} | DR Youth Clinic Blog`,
    description: post.excerpt || post.title,
    alternates: { canonical: `${SITE_URL}/blog/${params.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt || '',
      images: post.coverImage?.url ? [post.coverImage.url] : [],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author || 'DR Youth Clinic'],
    },
  };
}

const CATEGORY_COLOR: Record<string, string> = {
  'Hair Care': 'bg-emerald-500', 'Skin Care': 'bg-rose-500',
  'Laser': 'bg-violet-500', 'Aesthetics': 'bg-amber-500', 'General': 'bg-[#3B82C4]',
};

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const [related, siteConfig, relatedLinks, referencedDoctors, referencedVideos] = await Promise.all([
    getRelatedPosts(params.slug, post.category),
    getSiteConfig(),
    resolveRelatedLinks(post.bodyBlocks),
    resolveReferencedDoctors(post.bodyBlocks),
    resolveReferencedVideos(post.bodyBlocks),
  ]);
  const hasBlocks = Array.isArray(post.bodyBlocks) && post.bodyBlocks.length > 0;
  const html = hasBlocks ? '' : markdownToHtml(post.body || '');
  const headings = hasBlocks ? extractHeadingsFromBlocks(post.bodyBlocks) : extractHeadings(post.body || '');

  const dateFormatted = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.coverImage?.url || '',
    author: { '@type': 'Person', name: post.author || 'DR Youth Clinic' },
    publisher: {
      '@type': 'Organization',
      name: 'DR Youth Clinic',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <ReadingProgress />

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-end bg-[#0B2560] overflow-hidden">
          {post.coverImage?.url ? (
            <>
              <Image src={post.coverImage.url} alt={post.title} fill priority sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020e24]/95 via-[#020e24]/50 to-[#020e24]/20" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] via-[#1a3a7a] to-[#0f2040]" />
          )}

          <div className="relative z-10 max-w-4xl mx-auto px-6 pb-14 md:pb-20 w-full">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-semibold mb-6 transition">
              <ArrowLeft size={13} /> All Articles
            </Link>

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-extrabold uppercase tracking-[0.2em] text-white px-3 py-1 rounded-full ${CATEGORY_COLOR[post.category] || 'bg-[#3B82C4]'}`}>
                {post.category}
              </span>
              {post.featured && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5A623] border border-[#F5A623]/40 px-2.5 py-1 rounded-full">Featured</span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white leading-tight max-w-3xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-white/70 mt-4 text-base md:text-lg max-w-2xl leading-relaxed">{post.excerpt}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-6 text-white/50 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> {dateFormatted}
              </span>
              {post.readTime && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} /> {post.readTime}
                </span>
              )}
              <span className="text-white/30">·</span>
              <span className="text-white/70 font-medium">{post.author}</span>
            </div>
          </div>
        </section>

        {/* ── ARTICLE BODY ── */}
        <section className="bg-white py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-[1fr_280px] gap-12 xl:gap-16 items-start">

              {/* Article content */}
              <article>
                {hasBlocks ? (
                  <div className="text-[17px] text-gray-700 leading-[1.85]">
                    <BlockRenderer
                      blocks={post.bodyBlocks}
                      relatedLinks={relatedLinks}
                      serviceContext={{ doctors: referencedDoctors, videos: referencedVideos }}
                    />
                  </div>
                ) : (
                  <div
                    className="
                      text-[17px] text-gray-700 leading-[1.85]
                      [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-headline [&_h2]:font-extrabold [&_h2]:text-[#0B2560] [&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:pb-3 [&_h2]:border-b [&_h2]:border-gray-100
                      [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#0B2560] [&_h3]:mt-10 [&_h3]:mb-3
                      [&_p]:mb-7 [&_p]:leading-[1.9]
                      [&_ul]:pl-6 [&_ul]:mb-7 [&_ul]:space-y-2.5 [&_ul>li]:list-disc [&_ul>li]:marker:text-[#F5A623]
                      [&_ol]:pl-6 [&_ol]:mb-7 [&_ol]:space-y-2.5 [&_ol>li]:list-decimal [&_ol>li]:marker:text-[#3B82C4] [&_ol>li]:marker:font-bold
                      [&_blockquote]:border-l-4 [&_blockquote]:border-[#F5A623] [&_blockquote]:pl-6 [&_blockquote]:pr-4 [&_blockquote]:py-4 [&_blockquote]:my-10 [&_blockquote]:bg-[#fffbf0] [&_blockquote]:rounded-r-2xl [&_blockquote]:text-gray-600 [&_blockquote]:italic [&_blockquote]:text-lg
                      [&_strong]:text-[#0B2560] [&_strong]:font-bold
                      [&_em]:italic [&_em]:text-gray-600
                    "
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                )}

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    <Tag size={14} className="text-gray-400 shrink-0" />
                    {post.tags.map((t: string) => (
                      <span key={t} className="text-xs bg-[#f6faff] border border-blue-50 text-[#0B2560] px-3 py-1.5 rounded-full font-medium">{t}</span>
                    ))}
                  </div>
                )}

                {/* Author card */}
                <div className="mt-12 p-6 bg-[#f6faff] rounded-3xl border border-blue-50 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0B2560] flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                    {post.author?.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-[#0B2560]">{post.author}</p>
                    <p className="text-xs text-[#3B82C4] mt-0.5">{post.authorTitle}</p>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      Medically reviewed content from the DR Youth Clinic specialist team — committed to accurate, evidence-based skin and hair care information.
                    </p>
                  </div>
                </div>
              </article>

              {/* Sticky sidebar */}
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <ArticleSidebar headings={headings} />
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ── RELATED POSTS ── */}
        {related.length > 0 && (
          <section className="bg-[#f6faff] py-14 border-t border-blue-50">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-2xl font-headline font-extrabold text-[#0B2560] mb-8">More Articles</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((r: any) => (
                  <Link key={String(r._id)} href={`/blog/${r.slug}`}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]">
                      {r.coverImage?.url ? (
                        <Image src={r.coverImage.url} alt={r.title} fill sizes="400px" className="object-cover group-hover:scale-105 transition duration-500" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-4xl opacity-50">📝</div>
                      )}
                      <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full ${CATEGORY_COLOR[r.category] || 'bg-[#3B82C4]'}`}>
                        {r.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-[#0B2560] text-sm leading-snug line-clamp-2 group-hover:text-[#3B82C4] transition">{r.title}</h3>
                      <p className="text-gray-400 text-xs mt-2 line-clamp-2">{r.excerpt}</p>
                      <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-400">
                        <Clock size={10} /> {r.readTime}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <section className="bg-[#0B2560] py-14">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Take the Next Step</p>
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">Consult Our Specialists</h2>
            <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">Book a {siteConfig.consultationFree ? 'free ' : ''}consultation — personalised advice for your specific concern, zero commitment.</p>
            <Link href="/book" className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg">
              <Calendar size={15} /> {siteConfig.consultationCta}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
