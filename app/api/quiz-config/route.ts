import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import QuizConfig, { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import { migrateLegacyQuizConfig } from "@/app/lib/quizMigration";

export const revalidate = 300;

const getCachedQuizConfig = unstable_cache(
  async () => {
    try {
      await connectDB();
      const config = await (QuizConfig as any).findOne({}).lean();
      return config ? migrateLegacyQuizConfig(config) : DEFAULT_QUIZ_CONFIG;
    } catch {
      return DEFAULT_QUIZ_CONFIG;
    }
  },
  // Bumped to v2 — the config shape changed (rigid concerns/skinTypes/...
  // fields → generic questions[]), so a stale v1-shaped cache entry must not
  // be served after this deploy.
  ["quiz-config-v2"],
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
