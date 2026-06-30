import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';

export const metadata: Metadata = {
  title: 'Blog & Insights | DR Youth Clinic',
  description: 'Expert skin care, hair restoration and aesthetic medicine tips from the DR Youth Clinic specialist team.',
};

async function getPosts() {
  try {
    await connectDB();
    const posts = await Blog.find({ active: true } as any).sort({ featured: -1, publishedAt: -1 }).lean();
    return JSON.parse(JSON.stringify(posts));
  } catch { return []; }
}

const CATEGORY_COLOR: Record<string, string> = {
  'Hair Care': 'bg-emerald-500', 'Skin Care': 'bg-rose-500',
  'Laser': 'bg-violet-500', 'Aesthetics': 'bg-amber-500', 'General': 'bg-[#3B82C4]',
};

export default async function BlogPage() {
  const posts = await getPosts();
  const featured = posts.find((p: any) => p.featured) || posts[0];
  const rest = posts.filter((p: any) => p._id?.toString() !== featured?._id?.toString());

  return (
    <main>
      {/* ── HERO ── */}
      <section className="bg-[#0B2560] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Insights</p>
          <h1 className="text-3xl md:text-5xl font-headline font-extrabold text-white leading-tight">
            Expert Skin & Hair<br /><span className="text-[#F5A623]">Advice</span>
          </h1>
          <p className="text-white/60 mt-4 max-w-lg text-sm md:text-base leading-relaxed">
            Evidence-based tips, treatment guides and expert perspectives from our specialist team.
          </p>
        </div>
      </section>

      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">📝</p>
              <p className="text-gray-500 font-semibold">No articles published yet.</p>
              <p className="text-gray-400 text-sm mt-1">Check back soon for expert insights.</p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featured && (
                <Link href={`/blog/${featured.slug}`} className="group block mb-14">
                  <div className="grid lg:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#e8eff7] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                    <div className="relative aspect-[16/9] lg:aspect-auto lg:min-h-[360px] bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] overflow-hidden">
                      {featured.coverImage?.url ? (
                        <Image src={featured.coverImage.url} alt={featured.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition duration-700" />
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
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82C4] mb-3">Latest Article</p>
                      <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560] leading-tight group-hover:text-[#3B82C4] transition">
                        {featured.title}
                      </h2>
                      <p className="text-gray-500 mt-3 text-sm leading-relaxed line-clamp-3">{featured.excerpt}</p>
                      <div className="flex items-center gap-4 mt-5 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Calendar size={11} />{featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{featured.readTime}</span>
                      </div>
                      <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#0B2560] group-hover:text-[#3B82C4] transition">
                        Read Article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Rest of posts */}
              {rest.length > 0 && (
                <>
                  <h2 className="text-lg font-bold text-[#0B2560] mb-6">More Articles</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rest.map((p: any) => (
                      <Link key={String(p._id)} href={`/blog/${p.slug}`}
                        className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]">
                          {p.coverImage?.url ? (
                            <Image src={p.coverImage.url} alt={p.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition duration-500" />
                          ) : (
                            <div className="h-full flex items-center justify-center text-4xl opacity-40">📝</div>
                          )}
                          <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full ${CATEGORY_COLOR[p.category] || 'bg-[#3B82C4]'}`}>
                            {p.category}
                          </span>
                        </div>
                        <div className="p-5 md:p-6">
                          <h3 className="font-bold text-[#0B2560] text-base leading-snug line-clamp-2 group-hover:text-[#3B82C4] transition">{p.title}</h3>
                          <p className="text-gray-500 text-sm mt-2 leading-relaxed line-clamp-2">{p.excerpt}</p>
                          <div className="flex items-center gap-3 mt-4 text-gray-400 text-xs">
                            <span className="flex items-center gap-1"><Calendar size={10} />{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
                            <span className="flex items-center gap-1"><Clock size={10} />{p.readTime}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
