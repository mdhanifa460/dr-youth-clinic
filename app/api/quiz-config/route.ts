import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import QuizConfig, { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import { migrateLegacyQuizConfig, backfillClinicalFields } from "@/app/lib/quizMigration";

export const revalidate = 300;

const getCachedQuizConfig = unstable_cache(
  async () => {
    try {
      await connectDB();
      const config = await (QuizConfig as any).findOne({}).lean();
      return config ? backfillClinicalFields(migrateLegacyQuizConfig(config)) : DEFAULT_QUIZ_CONFIG;
    } catch {
      return DEFAULT_QUIZ_CONFIG;
    }
  },
  // Bumped to v3 — Clinical Intake data model extension added
  // conditionTags/clinicalIndicators/confidenceLevel etc.; a stale v2-shaped
  // cache entry must not be served after this deploy. (v2 was the prior
  // bump: rigid concerns/skinTypes/... fields → generic questions[].)
  ["quiz-config-v3"],
  { revalidate: 300, tags: ["quiz-config"] }
);

export async function GET() {
  try {
    const config = await getCachedQuizConfig();
    return NextResponse.json({ success: true, data: config });
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_QUIZ_CONFIG });
  }
}
