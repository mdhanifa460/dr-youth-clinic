// Extracted from the service detail page's inline "Your Treatment Journey"
// JSX so the exact same markup/styling can be reused by the Content Block
// Builder's "Treatment/Procedure Steps" reference block
// (app/components/contentblocks/BlockRenderer.tsx) without duplicating it.
export default function TreatmentStepsList({ steps }: { steps?: Array<{ title: string; description?: string }> }) {
  if (!steps?.length) return null;

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-7">Your Treatment Journey</h2>
      <div className="relative">
        <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#0B2560]/20 to-transparent hidden sm:block" />
        <div className="space-y-5">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 relative">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#0B2560] text-white font-bold text-sm flex items-center justify-center shadow-md ring-4 ring-white z-10">
                {i + 1}
              </div>
              <div className="flex-1 bg-[#f6faff] rounded-2xl p-4 border border-blue-50">
                <h3 className="font-bold text-[#0B2560] text-sm mb-1">{step.title}</h3>
                {step.description && <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
