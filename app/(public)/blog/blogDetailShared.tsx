// Shared render/metadata logic for a blog post, used by BOTH the generic
// /blog/[slug] route and the location-targeted /[location]/blog/[slug]
// route (see blogSeo.ts's header comment for why the latter exists).
// Deliberately NOT inside either route's own page.tsx — notFound() calls
// from a plain helper imported cross-route-segment did not reliably
// produce a real 404 status in this Next.js version (verified live: the
// response came back 200 even though the guard below was confirmed
// reached via a temporary debug log) — moving this into an ordinary
// module, outside any route segment, is the fix, and is also just the
// architecturally correct place for logic two routes both need.
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowLeft, Tag, ShieldCheck } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { Doctor } from '@/app/models/Doctor';
import { markdownToHtml, extractHeadings } from '@/app/lib/blogMarkdown';
import FocalImage from '@/app/components/media/FocalImage';
import { focalPointToObjectPosition } from '@/app/lib/media/focalPoint';
import ReadingProgress from './[slug]/ReadingProgress';
import ArticleSidebar, { MobileArticleToc } from './[slug]/ArticleSidebar';
import TrustSection from './[slug]/TrustSection';
import ArticleCtaBand from './[slug]/ArticleCtaBand';
import { getSiteConfig } from '@/app/lib/siteConfig';
import BlockRenderer from '@/app/components/contentblocks/BlockRenderer';
import { extractHeadingsFromBlocks } from '@/app/lib/contentBlocks/types';
import { resolveRelatedLinks, resolveReferencedDoctors, resolveReferencedVideos } from '@/app/lib/contentBlocks/relatedContent';
import { CATEGORY_COLOR } from '@/app/lib/blogCategories';
import { BreadcrumbSchema, BlogPostingSchema, FAQSchema } from '@/app/components/SchemaMarkup';
import { renderZoneSections } from '@/app/components/layoutEngine/renderZoneSections';
import InterestTracker from '@/app/components/InterestTracker';
import { resolveInterestCategory } from '@/app/lib/personalization';
import { isBlogAtCity, getBlogCities, getEffectiveBlogSeo, withCityInTitle } from '@/app/lib/blogSeo';

function InlineConsultCta({ text }: { text?: string }) {
  return (
    <aside className="not-prose my-8 rounded-2xl bg-[#0B2560] p-5 text-white flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5A623] mb-1">Have questions about your skin or hair?</p>
        <p className="text-sm text-white/80 leading-snug">{text || 'Talk to our dermatologists — honest advice, no commitment.'}</p>
      </div>
      <Link href="/book" className="inline-flex items-center justify-center rounded-xl bg-[#F5A623] px-5 py-3 text-sm font-extrabold text-[#0B2560] whitespace-nowrap">
        Book a Consultation
      </Link>
    </aside>
  );
}

// Build-time route list for both blog detail routes. WITHOUT generateStaticParams
// a dynamic-segment page is rendered fresh on EVERY request on Vercel
// (Cache-Control: private, no-store, X-Vercel-Cache: MISS, streamed loading
// skeleton -> footer layout shift, ~1.5s TTFB) even with `revalidate` set;
// declaring it (any list, even a partial one) turns on-demand ISR caching.
// A DB hiccup during the build must not fail it — [] still enables ISR.
export async function getBlogStaticParams(): Promise<{ slug: string; cities: string[] }[]> {
  try {
    await connectDB();
    const posts = (await Blog.find({ active: true } as any).select('slug targetLocations').lean()) as any[];
    return posts.filter((p) => p.slug).map((p) => ({ slug: p.slug, cities: getBlogCities(p) }));
  } catch { return []; }
}

const getPost = cache(unstable_cache(async (slug: string) => {
  try {
    await connectDB();
    const post = await Blog.findOne({ slug, active: true } as any).lean();
    if (!post) return null;
    return JSON.parse(JSON.stringify(post));
  } catch { return null; }
}, ['blog-post-by-slug'], { revalidate: 300, tags: ['blog'] }));

// `location`, when given, restricts related posts to ones that actually
// target that city too — otherwise a related-post card on a location page
// could link to a post that then 404s under that same location's /blog/
// (renderBlogDetailPage's own isBlogAtCity guard below).
const getRelatedPosts = unstable_cache(async (slug: string, category: string, location?: string) => {
  try {
    await connectDB();
    const locationFilter = location ? { targetLocations: location } : {};
    const posts = await Blog.find({ slug: { $ne: slug }, active: true, category, ...locationFilter } as any)
      .sort({ publishedAt: -1 }).limit(3).lean();
    if (posts.length < 3) {
      const more = await Blog.find({ slug: { $ne: slug }, active: true, ...locationFilter } as any)
        .sort({ publishedAt: -1 }).limit(3 - posts.length).lean();
      return JSON.parse(JSON.stringify([...posts, ...more]));
    }
    return JSON.parse(JSON.stringify(posts));
  } catch { return []; }
}, ['blog-related-posts'], { revalidate: 300, tags: ['blog'] });

const getReviewingDoctor = unstable_cache(async (doctorId?: string) => {
  if (!doctorId) return null;
  try {
    await connectDB();
    const doctor = await (Doctor as any).findById(doctorId).lean();
    if (!doctor) return null;
    return JSON.parse(JSON.stringify(doctor));
  } catch { return null; }
}, ['blog-reviewing-doctor'], { revalidate: 300, tags: ['blog', 'doctors'] });

// Shared by both /blog/[slug] (location omitted) and /[location]/blog/[slug]
// (the new location-targeted route) — same reasoning as Service's single
// canonical page implementation shared across /[location]/services/... URLs,
// just applied to a route that also needs to keep its original
// location-less URL working (see blogSeo.ts's header comment for why).
export async function generateBlogDetailMetadata(slug: string, location?: string): Promise<Metadata> {
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found' };
  const siteConfig = await getSiteConfig();
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
  const seo = location ? getEffectiveBlogSeo(post, location) : {
    metaTitle: post.metaTitle || post.title,
    metaDescription: post.metaDescription || post.excerpt || post.title,
  };
  // A city URL of the same post must not share an identical title with the
  // generic URL (or another city's) — add the city when it's not already there.
  if (location) {
    seo.metaTitle = withCityInTitle(seo.metaTitle, location.charAt(0).toUpperCase() + location.slice(1));
  }
  const ogImage = post.ogImage?.url || post.coverImage?.url;
  const canonicalPath = location ? `/${location}/blog/${slug}` : `/blog/${slug}`;
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    keywords: post.keywords?.length ? post.keywords : undefined,
    // Self-canonical for the location URL too, matching the exact
    // precedent set by /[location]/services/[category]/[slug] — each
    // city's copy of shared content is treated as its own canonical page,
    // not folded into the generic one. post.canonicalUrl (an explicit
    // admin override) only applies to the generic, location-less URL.
    alternates: { canonical: (!location && post.canonicalUrl) || `${SITE_URL}${canonicalPath}` },
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      images: ogImage ? [ogImage] : [],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author || siteConfig.defaultAuthorName],
    },
  };
}

// `location` is undefined for the generic /blog/[slug] page (unchanged
// behavior) and set for the /[location]/blog/[slug] route, which
// additionally 404s if the post doesn't actually target that city (never
// let every post become reachable under every city's URL regardless of
// what was configured).
export async function renderBlogDetailPage(slug: string, location?: string) {
  const post = await getPost(slug);
  if (!post) notFound();
  if (location && !isBlogAtCity(post, location)) notFound();

  const basePath = location ? `/${location}/blog` : '/blog';

  const [related, siteConfig, relatedLinks, referencedDoctors, referencedVideos, reviewingDoctor] = await Promise.all([
    getRelatedPosts(slug, post.category, location),
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
          { name: 'Medical Knowledge Center', url: `${SITE_URL}${basePath}` },
          { name: post.title, url: `${SITE_URL}${basePath}/${post.slug}` },
        ]}
      />
      <ReadingProgress />

      <main>
        {/* ── HERO ── */}
        <section className="relative flex flex-col md:min-h-[80vh] md:flex-row md:items-end bg-[#0B2560] overflow-hidden">
          {post.coverImage?.url ? (
            <>
              {/* Deliberately full-bleed/cinematic, not a discrete cropped
                  card — no fixed aspect ratio here by design, matching the
                  same choice on GlassHeroBanner. Focal point still applies. */}
              {/* Mobile: a plain 16:9 image BELOW the title block (order-2),
                  so the reader reaches the headline immediately instead of
                  a 70vh photo. md+: same element becomes the absolute
                  full-bleed cinematic background it always was. */}
              <div className="relative order-2 aspect-video w-full md:order-none md:absolute md:inset-0 md:aspect-auto">
                {/* Server-rendered next/image (NOT a client wrapper): a
                    client component loses the <link rel=preload> that
                    `priority` emits, which pushed this LCP image behind
                    other preloads (live mobile LCP hit 12s). The title is
                    already the page's <h1>, so the image is decorative —
                    empty alt also means a dead Cloudinary URL renders
                    nothing instead of a broken-image icon. */}
                <Image
                  src={post.coverImage.url}
                  alt=""
                  aria-hidden="true"
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                  style={{ objectPosition: focalPointToObjectPosition(post.coverImage.focalPoint) }}
                />
              </div>
              <div className="absolute inset-0 hidden md:block bg-gradient-to-t from-[#020e24]/95 via-[#020e24]/50 to-[#020e24]/20" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] via-[#1a3a7a] to-[#0f2040]" />
          )}

          <div className="relative z-10 order-1 max-w-4xl mx-auto px-5 sm:px-6 pt-6 pb-7 md:pt-0 md:pb-20 w-full">
            <Link href={basePath} className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-semibold mb-4 md:mb-6 transition">
              <ArrowLeft size={13} /> All Articles
            </Link>

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-extrabold uppercase tracking-[0.2em] text-white px-3 py-1 rounded-full ${CATEGORY_COLOR[post.category] || 'bg-[#3B82C4]'}`}>
                {post.category}
              </span>
              {post.featured && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A25607] border border-[#F5A623]/40 px-2.5 py-1 rounded-full">Featured</span>
              )}
            </div>

            <h1 className="text-[1.75rem] sm:text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white leading-tight max-w-3xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-white/70 mt-3 md:mt-4 text-base md:text-lg max-w-2xl leading-relaxed">{post.excerpt}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 md:mt-6 text-white/60 text-sm">
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
                  <ShieldCheck size={13} className="text-[#A25607]" /> Reviewed by {reviewingDoctor.name}
                </span>
              ) : (
                <span className="text-white/70 font-medium">{post.author}</span>
              )}
            </div>
          </div>
        </section>

        {/* ── ARTICLE BODY ── */}
        <section className="bg-white py-8 md:py-20 overflow-x-clip">
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8 lg:gap-12 xl:gap-16 items-start">

              {/* Article content */}
              {/* min-w-0: a grid item defaults to min-width:auto, so one wide
                  child (table/embed/long URL) stretched the whole column past
                  the mobile viewport and clipped the text on the right. */}
              <article className="min-w-0">
                <div className="lg:hidden">
                  <MobileArticleToc headings={headings} />
                </div>

                {hasBlocks ? (
                  <div className="text-[17px] text-gray-700 leading-[1.75] md:leading-[1.85] break-words">
                    {(() => {
                      const blocks = post.bodyBlocks;
                      const renderPart = (part: any[]) => (
                        <BlockRenderer
                          blocks={part}
                          relatedLinks={relatedLinks}
                          serviceContext={{ doctors: referencedDoctors, videos: referencedVideos }}
                        />
                      );
                      if (blocks.length < 6) return renderPart(blocks);
                      const mid = Math.ceil(blocks.length / 2);
                      return (
                        <>
                          {renderPart(blocks.slice(0, mid))}
                          <InlineConsultCta text={siteConfig.consultationCta} />
                          {renderPart(blocks.slice(mid))}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div
                    className="
                      text-[17px] text-gray-700 leading-[1.75] md:leading-[1.85] break-words
                      [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-headline [&_h2]:font-extrabold [&_h2]:text-[#0B2560] [&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:pb-3 [&_h2]:border-b [&_h2]:border-gray-100
                      [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#0B2560] [&_h3]:mt-10 [&_h3]:mb-3
                      [&_p]:mb-7 [&_p]:leading-[1.9]
                      [&_ul]:pl-6 [&_ul]:mb-7 [&_ul]:space-y-2.5 [&_ul>li]:list-disc [&_ul>li]:marker:text-[#A25607]
                      [&_ol]:pl-6 [&_ol]:mb-7 [&_ol]:space-y-2.5 [&_ol>li]:list-decimal [&_ol>li]:marker:text-[#2A6BA8] [&_ol>li]:marker:font-bold
                      [&_blockquote]:border-l-4 [&_blockquote]:border-[#F5A623] [&_blockquote]:pl-6 [&_blockquote]:pr-4 [&_blockquote]:py-4 [&_blockquote]:my-10 [&_blockquote]:bg-[#fffbf0] [&_blockquote]:rounded-r-2xl [&_blockquote]:text-gray-600 [&_blockquote]:italic [&_blockquote]:text-lg
                      [&_strong]:text-[#0B2560] [&_strong]:font-bold
                      [&_em]:italic [&_em]:text-gray-600
                      [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:max-w-full
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
                  <Link key={String(r._id)} href={`${basePath}/${r.slug}`}
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
                      <h3 className="font-bold text-[#0B2560] text-sm leading-snug line-clamp-2 group-hover:text-[#2A6BA8] transition">{r.title}</h3>
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
