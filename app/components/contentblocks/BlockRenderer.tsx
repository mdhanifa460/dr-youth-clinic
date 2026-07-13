import Link from "next/link";
import type { ContentBlock, BlockServiceContext } from "@/app/lib/contentBlocks/types";
import type { RelatedLinkInfo } from "@/app/lib/contentBlocks/relatedContent";
import FaqAccordion from "@/app/components/FaqAccordion";
import BenefitsGrid from "@/app/components/BenefitsGrid";
import TreatmentStepsList from "@/app/components/TreatmentStepsList";
import RecoveryTimeline from "@/app/components/RecoveryTimeline";
import TreatmentJourney from "@/app/components/TreatmentJourney";
import TreatmentJourneyExplorer from "@/app/components/TreatmentJourneyExplorer";
import TreatmentComparison from "@/app/components/TreatmentComparison";

const CALLOUT_STYLES: Record<string, string> = {
  info: "bg-[#f6faff] border-[#0B2560]/10 text-gray-700",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  medical: "bg-red-50 border-red-200 text-red-800",
};
const CALLOUT_ICONS: Record<string, string> = { info: "ℹ️", warning: "⚠️", success: "✅", medical: "⚕️" };

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function splitLines(text: string | undefined): string[] {
  return (text || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

function BlockItem({
  block,
  serviceContext,
  relatedLinks,
}: {
  block: ContentBlock;
  serviceContext?: BlockServiceContext;
  relatedLinks?: Record<string, RelatedLinkInfo>;
}) {
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

    // Reference blocks — Service-only, render live from serviceContext rather
    // than block.data (see app/lib/contentBlocks/types.ts). Each is a thin
    // wrapper around the same standalone component the fixed-position service
    // page section already uses, so there is exactly one implementation.
    case "faq-block":
      return <FaqAccordion faq={serviceContext?.faq} />;

    case "benefits-block":
      return <BenefitsGrid benefits={serviceContext?.benefits} />;

    case "treatment-steps-block":
      return <TreatmentStepsList steps={serviceContext?.treatmentSteps} />;

    case "recovery-timeline-block":
      return <RecoveryTimeline recoveryTime={serviceContext?.recoveryTime} stages={serviceContext?.recoveryStages} />;

    case "journey-block":
      return serviceContext ? (
        <TreatmentJourney
          sessions={serviceContext.sessionsCount || 6}
          treatmentName={serviceContext.serviceName || ""}
          phases={serviceContext.journeyPhases}
        />
      ) : null;

    case "journey-explorer-block":
      return serviceContext?.journeyExplorerVisible && (serviceContext.journeyExplorer?.length ?? 0) > 0 ? (
        <TreatmentJourneyExplorer stages={serviceContext.journeyExplorer!} serviceName={serviceContext.serviceName || ""} />
      ) : null;

    case "comparison-block":
      return serviceContext?.current ? (
        <TreatmentComparison current={serviceContext.current} alternatives={serviceContext.relatedServices || []} />
      ) : null;

    // Freestanding medical blocks — own stored data, work in any content type.
    case "doctor-recommendation": {
      const doctor = data.doctorId ? serviceContext?.doctors?.[data.doctorId] : undefined;
      if (!doctor || !data.quote) return null;
      return (
        <div className="mb-8 flex gap-4 p-5 rounded-2xl bg-[#f6faff] border border-blue-50 items-start">
          {doctor.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.photo.url} alt={doctor.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#0B2560]/10 flex items-center justify-center text-lg font-bold text-[#0B2560] shrink-0">
              {doctor.name?.[0]}
            </div>
          )}
          <div>
            <p className="text-gray-600 text-sm italic leading-relaxed mb-2">&ldquo;{data.quote}&rdquo;</p>
            <p className="font-bold text-[#0B2560] text-sm">{doctor.name}</p>
            {doctor.title && <p className="text-gray-400 text-xs">{doctor.title}</p>}
          </div>
        </div>
      );
    }

    case "suitability": {
      const suitable = splitLines(data.suitableFor);
      const notSuitable = splitLines(data.notSuitableFor);
      if (suitable.length === 0 && notSuitable.length === 0) return null;
      return (
        <div className="mb-8 grid sm:grid-cols-2 gap-4">
          {suitable.length > 0 && (
            <div className="rounded-2xl border border-green-100 bg-green-50/60 p-5">
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">Suitable For</p>
              <ul className="space-y-2">
                {suitable.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-green-500">✓</span> {s}</li>
                ))}
              </ul>
            </div>
          )}
          {notSuitable.length > 0 && (
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Not Suitable For</p>
              <ul className="space-y-2">
                {notSuitable.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-red-400">✕</span> {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case "expected-results": {
      const items = Array.isArray(data.items) ? data.items.filter((i: any) => i?.description) : [];
      if (items.length === 0) return null;
      return (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#0B2560] mb-3">What to Expect</h3>
          <div className="space-y-3">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-[#f6faff] border border-blue-50">
                {item.timeframe && (
                  <span className="shrink-0 text-xs font-bold text-[#3B82C4] bg-white px-2.5 py-1 rounded-full border border-blue-100 h-fit">{item.timeframe}</span>
                )}
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "side-effects": {
      const items = Array.isArray(data.items) ? data.items.filter((i: any) => i?.effect) : [];
      if (items.length === 0) return null;
      return (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#0B2560] mb-3">Possible Side Effects</h3>
          <ul className="space-y-2">
            {items.map((item: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 leading-relaxed">
                <span className="text-amber-500 mt-0.5">⚠</span>
                <span><span className="font-semibold text-gray-700">{item.effect}</span>{item.note && ` — ${item.note}`}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "related-link": {
      const key = data.entityType && data.entityId ? `${data.entityType}:${data.entityId}` : "";
      const info = key ? relatedLinks?.[key] : undefined;
      if (!info) return null;
      return (
        <Link
          href={info.href}
          className="mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl border border-blue-50 bg-[#f6faff] hover:border-[#3B82C4]/30 hover:shadow-md transition-all group"
        >
          <div>
            <p className="font-bold text-[#0B2560] text-sm">{data.label || info.title}</p>
            {info.subtitle && <p className="text-gray-400 text-xs mt-0.5">{info.subtitle}</p>}
          </div>
          <span className="text-[#3B82C4] group-hover:translate-x-1 transition-transform shrink-0">→</span>
        </Link>
      );
    }

    default:
      return null;
  }
}

// Public-facing renderer for Content Block Builder fields (Service.narrativeBlocks,
// Blog.bodyBlocks). Mirrors the per-type switch pattern already used by
// app/components/lp/LpRenderer.tsx for page-level sections, at the block grain
// instead. Callers fall back to their existing plain-text/Markdown rendering
// when `blocks` is empty — this component has no fallback logic of its own.
// `serviceContext` is only ever passed by Service content — the 7 reference
// block types read from it; every other block type ignores it. `relatedLinks`
// (see app/lib/contentBlocks/relatedContent.ts) is populated by both Service
// and Blog content for any "related-link" blocks present.
export default function BlockRenderer({
  blocks,
  serviceContext,
  relatedLinks,
}: {
  blocks: ContentBlock[];
  serviceContext?: BlockServiceContext;
  relatedLinks?: Record<string, RelatedLinkInfo>;
}) {
  return (
    <div>
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} serviceContext={serviceContext} relatedLinks={relatedLinks} />
      ))}
    </div>
  );
}
