import { NextResponse } from "next/server";
import { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import { getCachedQuizConfig } from "@/app/lib/quizConfig.server";

export const revalidate = 300;

// Strips treatmentMap's clinical/pricing content (name/price/description/
// confidence/clinicalIndicators/etc.) before this reaches the public
// browser — this route used to ship every concern's full treatment list,
// unlike /api/assessment-config's already-doctor-only treatmentMap. Only
// concernTag/concernLabel survive: PlanMyJourneyClient/scoreJourneyConcern
// still need those for concern labeling and category scoring, neither
// reads `treatments` anymore now that Treatment Mapping is doctor-only.
function stripTreatmentMap(config: any) {
  return {
    ...config,
    treatmentMap: (config.treatmentMap || []).map((e: any) => ({
      concernTag: e.concernTag,
      concernLabel: e.concernLabel,
      treatments: [],
    })),
  };
}

export async function GET() {
  try {
    const config = await getCachedQuizConfig();
    return NextResponse.json({ success: true, data: stripTreatmentMap(config) });
  } catch {
    return NextResponse.json({ success: true, data: stripTreatmentMap(DEFAULT_QUIZ_CONFIG) });
  }
}
