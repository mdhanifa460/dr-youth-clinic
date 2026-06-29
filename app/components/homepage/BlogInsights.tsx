import Image from 'next/image';
import Link from 'next/link';

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
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] leading-tight">
            {headline}
          </h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">{subheadline}</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {posts.slice(0, 3).map((post: any, i: number) => (
            <Link key={i} href={post.href || '#'} className="bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#e8eff7] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,37,96,0.1)] transition-all duration-300 group">
              <div className="relative aspect-[16/10] bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] overflow-hidden">
                {post.image?.url ? (
                  <Image src={post.image.url} alt={post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover md:group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-5xl">📝</span>
                  </div>
                )}
                {post.category && (
                  <span className="absolute top-3 left-3 bg-[#0B2560] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                )}
              </div>
              <div className="p-5 md:p-6">
                <h3 className="font-bold text-[#0B2560] text-base leading-snug group-hover:text-[#3B82C4] transition">
                  {post.title}
                </h3>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-3 mt-4 text-gray-400 text-xs">
                  {post.date && <span>{post.date}</span>}
                  {post.readTime && <span>·</span>}
                  {post.readTime && <span>{post.readTime}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
