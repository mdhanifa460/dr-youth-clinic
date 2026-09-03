'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import SearchInput from '@/app/components/ui/SearchInput';
import CategoryPill from '@/app/components/ui/CategoryPill';
import NewsletterSignup from '@/app/components/NewsletterSignup';
import FocalImage from '@/app/components/media/FocalImage';
import { focalPointToObjectPosition } from '@/app/lib/media/focalPoint';
import { BLOG_CATEGORIES, CATEGORY_COLOR } from '@/app/lib/blogCategories';
import { useScrollOnChange } from '@/app/lib/useScrollOnChange';

interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  coverImage?: { url: string; publicId?: string; focalPoint?: any };
  readTime: string;
  publishedAt: string;
  featured: boolean;
  reviewedByDoctorId?: { name: string; title?: string; photo?: { url: string } } | null;
}

interface TrendingService {
  _id: string;
  name: string;
  category: string;
  heroDescription: string;
  heroImage: { url: string } | null;
  href: string;
}

interface VideoItem {
  _id: string;
  title: string;
  slug: string;
  category: string;
  thumbnail?: { url: string };
  duration?: string;
  doctor?: { name: string } | null;
}

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function ArticleCard({ post, basePath }: { post: Post; basePath: string }) {
  return (
    <Link
      href={`${basePath}/${post.slug}`}
      className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* 16:9 — the site's Blog Cover ratio standard (was 16:10) */}
      <FocalImage
        image={post.coverImage}
        aspectRatio="16/9"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        alt={post.title}
        className="bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]"
        imgClassName="group-hover:scale-105 transition duration-500"
        fallbackEmoji="📝"
      >
        <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full ${CATEGORY_COLOR[post.category] || 'bg-[#3B82C4]'}`}>
          {post.category}
        </span>
      </FocalImage>
      {/* flex-col + flex-1 + mt-auto footer: keeps the date/read-time row
          pinned to the bottom regardless of title/excerpt length, so cards
          in the same grid row line up instead of drifting per-card. */}
      <div className="flex flex-col flex-1 p-5 md:p-6">
        <h3 className="font-bold text-[#0B2560] text-base leading-snug line-clamp-2 group-hover:text-[#3B82C4] transition">{post.title}</h3>
        {post.excerpt && <p className="text-gray-500 text-sm mt-2 leading-relaxed line-clamp-2">{post.excerpt}</p>}
        <div className="flex items-center justify-between mt-auto pt-4">
          <div className="flex items-center gap-3 text-gray-500 text-xs">
            <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(post.publishedAt)}</span>
            <span className="flex items-center gap-1"><Clock size={10} />{post.readTime}</span>
          </div>
          {post.reviewedByDoctorId?.name && (
            <span className="text-[10px] font-semibold text-[#3B82C4] bg-[#f6faff] px-2 py-1 rounded-full">✓ Doctor Reviewed</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function BlogPageClient({
  posts,
  trendingServices,
  videos,
  postsPerPage = 9,
  basePath = '/blog',
}: {
  posts: Post[];
  postsPerPage?: number;
  trendingServices: TrendingService[];
  videos: VideoItem[];
  // Set to `/${location}/blog` by the location-targeted listing route so
  // every card/featured-post link stays within that city's URL space —
  // defaults to the generic '/blog', unchanged for the existing page.
  basePath?: string;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [videoCategory, setVideoCategory] = useState('All');
  const [page, setPage] = useState(1);
  const gridRef = useScrollOnChange(activeCategory);

  const popularSearches = useMemo(() => {
    const freq: Record<string, number> = {};
    posts.forEach((p) => (p.tags || []).forEach((t) => { freq[t] = (freq[t] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }, [posts]);

  const isFiltering = !!search.trim() || activeCategory !== 'All';

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const byCategory = activeCategory === 'All' ? posts : posts.filter((p) => p.category === activeCategory);
    if (!q) return byCategory;
    return byCategory.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [posts, activeCategory, search]);

  const featured = !isFiltering ? posts.find((p) => p.featured) || posts[0] : null;

  // Doctor-reviewed posts are curated into their own highlighted section
  // below — computed here, before gridPosts, so gridPosts can exclude
  // them. Previously these two sections were computed independently from
  // the same full `posts` list with no exclusion between them, so any
  // doctor-reviewed post that also fell on the visible "Latest Articles"
  // page rendered as the same card twice on one page. Only applied when
  // not actively searching/filtering — a search result set should show
  // every real match, not quietly hide one because it's also "recommended".
  const doctorRecommended = useMemo(
    () => (isFiltering ? [] : posts.filter((p) => p.reviewedByDoctorId?.name && p._id !== featured?._id).slice(0, 3)),
    [posts, isFiltering, featured?._id]
  );
  const doctorRecommendedIds = useMemo(() => new Set(doctorRecommended.map((p) => p._id)), [doctorRecommended]);

  const gridPosts = filtered.filter((p) => p._id !== featured?._id && !doctorRecommendedIds.has(p._id));
  const totalPages = Math.max(1, Math.ceil(gridPosts.length / postsPerPage));
  const pagedPosts = gridPosts.slice((page - 1) * postsPerPage, page * postsPerPage);

  const goToPage = (p: number) => {
    setPage(p);
    document.getElementById('latest-articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Reset to page 1 whenever the visible set changes underneath the pager.
  useEffect(() => { setPage(1); }, [search, activeCategory]);

  const videoCategories = useMemo(
    () => ['All', ...Array.from(new Set(videos.map((v) => v.category).filter(Boolean)))],
    [videos]
  );
  const filteredVideos = videoCategory === 'All' ? videos : videos.filter((v) => v.category === videoCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      {/* pb-32 (vs. pb-20 on lg+) keeps the category pills below clear of the
          fixed mobile WhatsApp/Call/Book bar — without it, the pills row can
          land partially behind the bar right on first paint, before any
          scrolling. */}
      <section className="bg-gradient-to-br from-[#0B2560] via-[#1a3a7a] to-[#0B2560] text-white pt-16 pb-32 lg:pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#F5A623] mb-4">
            Medical Knowledge Center
          </span>
          <h1 className="text-3xl md:text-5xl font-headline font-extrabold leading-tight mb-4">
            Trusted Skin & Hair <span className="text-[#F5A623]">Education</span>
          </h1>
          <p className="text-white/70 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Evidence-based articles, expert insights and treatment guides to help you make the right decisions.
          </p>

          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setActiveCategory('All'); }}
            placeholder="Search treatments, symptoms, concerns..."
          />

          {popularSearches.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wide mr-1">Popular:</span>
              {popularSearches.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setSearch(tag); setActiveCategory('All'); }}
                  className="text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div ref={gridRef} className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        {/* ── Category pills ── */}
        {!search && (
          <div className="flex flex-wrap gap-2 mb-10">
            <CategoryPill label="All" active={activeCategory === 'All'} onClick={() => setActiveCategory('All')} />
            {BLOG_CATEGORIES.map((c) => (
              <CategoryPill key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
            ))}
          </div>
        )}

        {search && (
          <p className="text-sm text-gray-500 mb-8">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
            <button onClick={() => setSearch('')} className="ml-2 text-[#3B82C4] font-semibold hover:underline">Clear</button>
          </p>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">📝</p>
            <p className="text-gray-500 font-semibold">No articles published yet.</p>
            <p className="text-gray-500 text-sm mt-1">Check back soon for expert insights.</p>
          </div>
        ) : (
          <>
            {/* ── Featured article ── */}
            {featured && (
              <Link href={`${basePath}/${featured.slug}`} className="group block mb-14">
                <div className="grid lg:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#e8eff7] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-[16/9] lg:aspect-auto lg:min-h-[360px] bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] overflow-hidden">
                    {featured.coverImage?.url ? (
                      <Image
                        src={featured.coverImage.url}
                        alt={featured.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition duration-700"
                        style={{ objectPosition: focalPointToObjectPosition((featured.coverImage as any)?.focalPoint) }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-8xl opacity-30">📝</div>
                    )}
                    <span className={`absolute top-4 left-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white px-3 py-1.5 rounded-full ${CATEGORY_COLOR[featured.category] || 'bg-[#3B82C4]'}`}>
                      {featured.category}
                    </span>
                    <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-[#F5A623] border border-[#F5A623]/50 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm">
                      Featured
                    </span>
                  </div>
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82C4] mb-3">Featured Article</p>
                    <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560] leading-tight group-hover:text-[#3B82C4] transition">
                      {featured.title}
                    </h2>
                    {featured.excerpt && <p className="text-gray-500 mt-3 text-sm leading-relaxed line-clamp-3">{featured.excerpt}</p>}
                    <div className="flex items-center gap-4 mt-5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(featured.publishedAt)}</span>
                      <span className="flex items-center gap-1"><Clock size={11} />{featured.readTime}</span>
                      {featured.reviewedByDoctorId?.name && (
                        <span className="flex items-center gap-1 text-[#3B82C4] font-semibold">✓ Reviewed by {featured.reviewedByDoctorId.name}</span>
                      )}
                    </div>
                    <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#0B2560] group-hover:text-[#3B82C4] transition">
                      Read Article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* ── Latest / filtered articles ── */}
            {gridPosts.length > 0 ? (
              <section id="latest-articles" className="mb-16">
                <h2 className="text-lg font-bold text-[#0B2560] mb-6">{isFiltering ? 'Results' : 'Latest Articles'}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pagedPosts.map((p) => <ArticleCard key={p._id} post={p} basePath={basePath} />)}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-10">
                    <button
                      onClick={() => goToPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                      className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#0B2560] disabled:opacity-30 hover:border-[#0B2560]/40 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goToPage(i + 1)}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition ${
                            page === i + 1 ? 'bg-[#0B2560] text-white' : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => goToPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      aria-label="Next page"
                      className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#0B2560] disabled:opacity-30 hover:border-[#0B2560]/40 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </section>
            ) : isFiltering ? (
              <div className="text-center py-16 mb-8">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-lg font-bold text-gray-700 mb-2">No results found</p>
                <p className="text-sm text-gray-500 mb-6">Try a different search term or browse by category.</p>
                <button
                  onClick={() => { setSearch(''); setActiveCategory('All'); }}
                  className="text-sm bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold"
                >
                  Show all articles
                </button>
              </div>
            ) : null}
          </>
        )}

        {/* ── Doctor-recommended reads ── */}
        {!isFiltering && doctorRecommended.length > 0 && (
          <section className="mb-16">
            <p className="text-xs font-bold text-[#3B82C4] uppercase tracking-widest mb-1">Doctor Recommended</p>
            <h2 className="text-lg font-bold text-[#0B2560] mb-6">Reviewed & Recommended Reads</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctorRecommended.map((p) => <ArticleCard key={p._id} post={p} basePath={basePath} />)}
            </div>
          </section>
        )}

        {/* ── Trending treatments ── */}
        {!isFiltering && trendingServices.length > 0 && (
          <section className="mb-16">
            <h2 className="text-lg font-bold text-[#0B2560] mb-6">Trending Treatments</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingServices.map((s) => (
                <Link
                  key={s._id}
                  href={s.href}
                  className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-4"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]">
                    {s.heroImage?.url ? (
                      <Image src={s.heroImage.url} alt={s.name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xl opacity-40">💉</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0B2560] text-sm leading-snug line-clamp-1 group-hover:text-[#3B82C4] transition">{s.name}</p>
                    {s.heroDescription && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{s.heroDescription}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Video learning ── */}
        {!isFiltering && videos.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[#0B2560] mb-6">Video Learning</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {videoCategories.map((c) => (
                <CategoryPill key={c} label={c} active={videoCategory === c} onClick={() => setVideoCategory(c)} />
              ))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.slice(0, 6).map((v) => (
                <Link
                  key={v._id}
                  href={`/academy/${v.slug}`}
                  className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-[#0B2560]">
                    {v.thumbnail?.url ? (
                      <Image src={v.thumbnail.url} alt={v.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition duration-500" />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                      <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play size={18} className="text-[#0B2560] ml-0.5" fill="currentColor" />
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-[#0B2560] text-sm leading-snug line-clamp-2">{v.title}</p>
                    {v.doctor?.name && <p className="text-gray-500 text-xs mt-1.5">{v.doctor.name}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-16">
          <NewsletterSignup source="blog" />
        </div>
      </div>
    </div>
  );
}
