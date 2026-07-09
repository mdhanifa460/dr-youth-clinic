interface GalleryImage { url?: string; caption?: string }
interface GalleryData { headline?: string; subheading?: string; images?: GalleryImage[] }

export default function GallerySection({ data }: { data: GalleryData }) {
  const { headline, subheading, images = [] } = data;
  const valid = images.filter((img) => img.url);
  if (!valid.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Take a Look Inside</p>
          {headline && <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>}
          {subheading && <p className="text-gray-500 mt-3 text-sm max-w-xl mx-auto">{subheading}</p>}
        </div>
        <div className={`grid gap-4 ${valid.length === 1 ? 'max-w-lg mx-auto' : valid.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {valid.map((img, i) => (
            <div key={i} className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm group">
              <img src={img.url} alt={img.caption || `Clinic photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {img.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                  <p className="text-white text-xs font-medium">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
