import Link from "next/link";
import type { ContentBlock } from "@/app/lib/contentBlocks/types";

const CALLOUT_STYLES: Record<string, string> = {
  info: "bg-[#f6faff] border-[#0B2560]/10 text-gray-700",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
};
const CALLOUT_ICONS: Record<string, string> = { info: "ℹ️", warning: "⚠️", success: "✅" };

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function BlockItem({ block }: { block: ContentBlock }) {
  if (!block.visible) return null;
  const data = block.data || {};

  switch (block.type) {
    case "heading": {
      const text = data.text as string | undefined;
      if (!text) return null;
      const id = slugify(text);
      if (data.level === 3) return <h3 id={id} className="text-xl font-bold text-[#0B2560] mt-8 mb-3">{text}</h3>;
      if (data.level === 4) return <h4 id={id} className="text-lg font-bold text-[#0B2560] mt-6 mb-2">{text}</h4>;
      return <h2 id={id} className="text-2xl font-headline font-bold text-[#0B2560] mt-10 mb-4">{text}</h2>;
    }

    case "paragraph":
      return data.html ? (
        <div
          className="mb-6 text-gray-600 leading-[1.9] text-[15px] [&_strong]:text-[#0B2560] [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_a]:text-[#3B82C4] [&_a]:underline [&_mark]:bg-[#F5A623]/30 [&_mark]:rounded [&_mark]:px-0.5"
          dangerouslySetInnerHTML={{ __html: data.html }}
        />
      ) : null;

    case "bullet-list":
      return Array.isArray(data.items) && data.items.filter(Boolean).length > 0 ? (
        <ul className="mb-6 pl-6 space-y-2 list-disc marker:text-[#F5A623]">
          {data.items.filter(Boolean).map((item: string, i: number) => (
            <li key={i} className="text-gray-600 leading-relaxed text-[15px]">{item}</li>
          ))}
        </ul>
      ) : null;

    case "numbered-list":
      return Array.isArray(data.items) && data.items.filter(Boolean).length > 0 ? (
        <ol className="mb-6 pl-6 space-y-2 list-decimal marker:text-[#3B82C4] marker:font-bold">
          {data.items.filter(Boolean).map((item: string, i: number) => (
            <li key={i} className="text-gray-600 leading-relaxed text-[15px]">{item}</li>
          ))}
        </ol>
      ) : null;

    case "image":
      return data.url ? (
        <figure className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.url} alt={data.alt || ""} className="w-full rounded-2xl object-cover" />
          {data.caption && <figcaption className="text-xs text-gray-400 text-center mt-2">{data.caption}</figcaption>}
        </figure>
      ) : null;

    case "quote":
      return data.text ? (
        <blockquote className="border-l-4 border-[#F5A623] pl-6 pr-4 py-4 my-8 bg-[#fffbf0] rounded-r-2xl text-gray-600 italic text-lg">
          <p>{data.text}</p>
          {data.attribution && <footer className="text-sm text-gray-400 mt-2 not-italic">— {data.attribution}</footer>}
        </blockquote>
      ) : null;

    case "callout":
      return data.text ? (
        <div className={`mb-6 p-5 rounded-2xl border flex items-start gap-3 ${CALLOUT_STYLES[data.variant] || CALLOUT_STYLES.info}`}>
          <span className="text-xl shrink-0">{CALLOUT_ICONS[data.variant] || CALLOUT_ICONS.info}</span>
          <p className="text-sm leading-relaxed">{data.text}</p>
        </div>
      ) : null;

    case "cta":
      return data.label && data.href ? (
        <div className="mb-8">
          <Link href={data.href} className="inline-block px-8 py-3.5 bg-[#0B2560] hover:bg-[#0d2d73] text-white font-bold rounded-xl transition">
            {data.label}
          </Link>
        </div>
      ) : null;

    case "divider":
      return <hr className="my-10 border-gray-100" />;

    default:
      return null;
  }
}

// Public-facing renderer for Content Block Builder fields (Service.narrativeBlocks,
// Blog.bodyBlocks). Mirrors the per-type switch pattern already used by
// app/components/lp/LpRenderer.tsx for page-level sections, at the block grain
// instead. Callers fall back to their existing plain-text/Markdown rendering
// when `blocks` is empty — this component has no fallback logic of its own.
export default function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div>
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
    </div>
  );
}
