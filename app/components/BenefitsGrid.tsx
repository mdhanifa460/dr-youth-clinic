// Extracted from the service detail page's inline "Key Benefits" JSX so the
// exact same markup/styling can be reused by the Content Block Builder's
// "Benefits" reference block (app/components/contentblocks/BlockRenderer.tsx)
// without duplicating it.
export default function BenefitsGrid({ benefits }: { benefits?: Array<{ icon: string; title: string; description?: string }> }) {
  if (!benefits?.length) return null;

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Key Benefits</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {benefits.map((b, i) => (
          <div key={i} className="group flex gap-4 p-5 rounded-2xl bg-[#f6faff] border border-blue-50 hover:border-[#3B82C4]/30 hover:shadow-md transition-all">
            <span className="text-2xl shrink-0 mt-0.5">{b.icon}</span>
            <div>
              <p className="font-bold text-[#0B2560] text-sm mb-1">{b.title}</p>
              {b.description && <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
