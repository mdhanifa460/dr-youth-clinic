import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, Tag, ShieldCheck } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { Doctor } from '@/app/models/Doctor';
import { markdownToHtml, extractHeadings } from '@/app/lib/blogMarkdown';
import FocalImage from '@/app/components/media/FocalImage';
import { focalPointToObjectPosition } from '@/app/lib/media/focalPoint';
import ReadingProgress from './ReadingProgress';
import ArticleSidebar, { MobileArticleToc } from './ArticleSidebar';
import TrustSection from './TrustSection';
import ArticleCtaBand from './ArticleCtaBand';
import { getSiteConfig } from '@/app/lib/siteConfig';
import BlockRenderer from '@/app/components/contentblocks/BlockRenderer';
import { extractHeadingsFromBlocks } from '@/app/lib/contentBlocks/types';
import { resolveRelatedLinks, resolveReferencedDoctors, resolveReferencedVideos } from '@/app/lib/contentBlocks/relatedContent';
import { CATEGORY_COLOR } from '@/app/lib/blogCategories';
import { BreadcrumbSchema, BlogPostingSchema, FAQSchema } from '@/app/components/SchemaMarkup';
import { renderZoneSections } from '@/app/components/layoutEngine/renderZoneSections';
import InterestTracker from '@/app/components/InterestTracker';
import { resolveInterestCategory } from '@/app/lib/personalization';

// No `revalidate` export existed before this fix — this page had zero
// caching at any level and ran three uncached queries on every single
// visitor request. `revalidate` below turns that into ISR (one real fetch
// per post per 5-minute window). React's cache() additionally dedupes
// getPost() specifically within one regeneration — generateMetadata and
// the page component both call it, and without cache() that's the same
// query run twice every time this page actually regenerates.
export const revalidate = 300;

const getPost = cache(async (slug: string) => {
  try {
    await connectDB();
    const post = await Blog.findOne({ slug, active: true } as any).lean();
    if (!post) return null;
    return JSON.parse(JSON.stringify(post));
  } catch { return null; }
});

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

async function getReviewingDoctor(doctorId?: string) {
  if (!doctorId) return null;
  try {
    await connectDB();
    const doctor = await (Doctor as any).findById(doctorId).lean();
    if (!doctor) return null;
    return JSON.parse(JSON.stringify(doctor));
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Post Not Found' };
  const siteConfig = await getSiteConfig();
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || post.title;
  const ogImage = post.ogImage?.url || post.coverImage?.url;
  return {
    title,
    description,
    keywords: post.keywords?.length ? post.keywords : undefined,
    alternates: { canonical: post.canonicalUrl || `${SITE_URL}/blog/${params.slug}` },
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || '',
      images: ogImage ? [ogImage] : [],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author || siteConfig.defaultAuthorName],
    },
  };
}

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const [related, siteConfig, relatedLinks, referencedDoctors, referencedVideos, reviewingDoctor] = await Promise.all([
    getRelatedPosts(params.slug, post.category),
    getSiteConfig(),
    resolveRelatedLinks(post.bodyBlocks),
    resolveReferencedDoctors(post.bodyBlocks),
    resolveReferencedVideos(post.bodyBlocks),
    getReviewingDoctor(post.reviewedByDoctorId),
  ]);
  const hasBlocks = Array.isArray(post.bodyBlocks) && post.bodyBlocks.length > 0;
  const html = hasBlocks ? '' : markdownToHtml(post.body || '');
  const headings = hasBlocks ? extractHeadingsFromBlocks(post.bodyBlocks) : extractHeadings(post.body || '');

  // Feeds FAQPage schema below — this is what makes the Article Intelligence
  // checklist's "FAQ Schema Generated" check true rather than a false promise.
  const faqItems = (post.bodyBlocks || [])
    .filter((b: any) => b.visible && b.type === 'faq')
    .flatMap((b: any) => (Array.isArray(b.data?.items) ? b.data.items : []))
    .filter((i: any) => i?.question?.trim() && i?.answer?.trim());

  const dateFormatted = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Content Layout Engine — additive main/sidebar zones, opt-in per post via
  // `layoutEngineEnabled`. The article body, TOC, related posts, and CTA
  // band are untouched; these zones only add registry sections around them
  // (Offer Banner, Doctor Card, Treatment CTA, Newsletter, FAQ, Related
  // Services, Related Blogs, Video), per the incremental migration plan.
  const [layoutEngineMain, layoutEngineSidebar] = post.layoutEngineEnabled
    ? await Promise.all([
        renderZoneSections({ pageType: 'blog', pageId: String(post._id), context: { page: {} }, zone: 'main' }),
        renderZoneSections({ pageType: 'blog', pageId: String(post._id), context: { page: {} }, zone: 'sidebar' }),
      ])
    : [null, null];

  return (
    <>
      <BlogPostingSchema
        title={post.title}
        description={post.excerpt || post.title}
        slug={post.slug}
        image={post.coverImage?.url}
        authorName={reviewingDoctor?.name || post.author || siteConfig.defaultAuthorName}
        authorCredential={reviewingDoctor?.qualifications}
        datePublished={post.publishedAt}
        dateModified={post.updatedAt}
      />
      <FAQSchema faqs={faqItems} />
      <InterestTracker eventType="blog_read" category={resolveInterestCategory(post.category)} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: SITE_URL },
          // No category-scoped blog route exists — a 4th "category" level
          // pointing at the same /blog URL as "Medical Knowledge Center"
          // would give a BreadcrumbList two positions with an identical
          // `item`, which structured-data validators flag as invalid.
          { name: 'Medical Knowledge Center', url: `${SITE_URL}/blog` },
          { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
        ]}
      />
      <ReadingProgress />

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-end bg-[#0B2560] overflow-hidden">
          {post.coverImage?.url ? (
            <>
              {/* Deliberately full-bleed/cinematic, not a discrete cropped
                  card — no fixed aspect ratio here by design, matching the
                  same choice on GlassHeroBanner. Focal point still applies. */}
              <Image
                src={post.coverImage.url}
                alt={post.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: focalPointToObjectPosition(post.coverImage.focalPoint) }}
              />
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
              {reviewingDoctor ? (
                <span className="flex items-center gap-1.5 text-white/70 font-medium">
                  <ShieldCheck size={13} className="text-[#F5A623]" /> Reviewed by {reviewingDoctor.name}
                </span>
              ) : (
                <span className="text-white/70 font-medium">{post.author}</span>
              )}
            </div>
          </div>
        </section>

        {/* ── ARTICLE BODY ── */}
        <section className="bg-white py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-[1fr_280px] gap-12 xl:gap-16 items-start">

              {/* Article content */}
              <article>
                <div className="lg:hidden">
                  <MobileArticleToc headings={headings} />
                </div>

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
                    <Tag size={14} className="text-gray-500 shrink-0" />
                    {post.tags.map((t: string) => (
                      <span key={t} className="text-xs bg-[#f6faff] border border-blue-50 text-[#0B2560] px-3 py-1.5 rounded-full font-medium">{t}</span>
                    ))}
                  </div>
                )}

                <TrustSection
                  doctor={reviewingDoctor}
                  references={post.medicalReferences}
                  author={post.author}
                  authorTitle={post.authorTitle}
                />

                {layoutEngineMain && layoutEngineMain.length > 0 && (
                  <div className="mt-10 space-y-8">{layoutEngineMain}</div>
                )}
              </article>

              {/* Sticky sidebar */}
              <aside className="hidden lg:block">
                <div className="sticky top-24 space-y-4">
                  <ArticleSidebar headings={headings} />
                  {layoutEngineSidebar}
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
                    className="flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <FocalImage
                      image={r.coverImage}
                      aspectRatio="16/9"
                      sizes="400px"
                      alt={r.title}
                      className="bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]"
                      imgClassName="group-hover:scale-105 transition duration-500"
                      fallbackEmoji="📝"
                    >
                      <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full ${CATEGORY_COLOR[r.category] || 'bg-[#3B82C4]'}`}>
                        {r.category}
                      </span>
                    </FocalImage>
                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="font-bold text-[#0B2560] text-sm leading-snug line-clamp-2 group-hover:text-[#3B82C4] transition">{r.title}</h3>
                      <p className="text-gray-500 text-xs mt-2 line-clamp-2">{r.excerpt}</p>
                      <div className="flex items-center gap-2 mt-auto pt-3 text-[11px] text-gray-500">
                        <Clock size={10} /> {r.readTime}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <ArticleCtaBand
          consultationFree={siteConfig.consultationFree}
          consultationCta={siteConfig.consultationCta}
          publicWhatsApp={siteConfig.publicWhatsApp}
        />
      </main>
    </>
  );
}
