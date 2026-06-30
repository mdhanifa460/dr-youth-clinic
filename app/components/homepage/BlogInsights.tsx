import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const CATEGORY_COLOR: Record<string, string> = {
  'Hair Care': 'bg-emerald-500', 'Skin Care': 'bg-rose-500',
  'Laser': 'bg-violet-500', 'Aesthetics': 'bg-amber-500', 'General': 'bg-[#3B82C4]',
};

export default function BlogInsights({ data }: { data: any }) {
  const {
    headline = 'Latest Insights',
    subheadline = 'Tips, trends & expert advice',
    posts = [],
  } = data || {};

  if (posts.length === 0) return null;

  return (
    <section id="blog" className="py-12 md:py-16 lg:py-20 bg-[#f6faff]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] leading-tight">
              {headline}
            </h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">{subheadline}</p>
          </div>
          {/* Desktop */}
          <Link href="/blog" className="hidden md:inline-flex items-center gap-1.5 border border-[#0B2560] text-[#0B2560] hover:bg-[#0B2560] hover:text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap">
            View All Articles →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {posts.slice(0, 3).map((post: any, i: number) => {
            const href = post.slug ? `/blog/${post.slug}` : (post.href || '#');
            const date = post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : post.date || '';
            const categoryBg = CATEGORY_COLOR[post.category] || 'bg-[#0B2560]';
            return (
              <Link key={post._id ?? i} href={href} className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#e8eff7] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,37,96,0.1)] transition-all duration-300 group">
                <div className="relative aspect-[16/10] bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] overflow-hidden">
                  {(post.coverImage?.url || post.image?.url) ? (
                    <Image src={post.coverImage?.url || post.image?.url} alt={post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover md:group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="h-full flex items-center justify-center"><span className="text-5xl opacity-40">📝</span></div>
                  )}
                  {post.category && (
                    <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full ${categoryBg}`}>
                      {post.category}
                    </span>
                  )}
                </div>
                <div className="p-5 md:p-6">
                  <h3 className="font-bold text-[#0B2560] text-base leading-snug line-clamp-2 group-hover:text-[#3B82C4] transition">{post.title}</h3>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      {date && <span>{date}</span>}
                      {post.readTime && <><span>·</span><span>{post.readTime}</span></>}
                    </div>
                    <ArrowRight size={13} className="text-gray-300 group-hover:text-[#3B82C4] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile */}
        <div className="mt-8 flex justify-center md:hidden">
          <Link href="/blog" className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-[#0d2d73] transition-all shadow-lg shadow-[#0B2560]/20">
            View All Articles →
          </Link>
        </div>
      </div>
    </section>
  );
}
