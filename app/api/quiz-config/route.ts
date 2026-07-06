import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import QuizConfig, { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";

export const revalidate = 300;

const getCachedQuizConfig = unstable_cache(
  async () => {
    try {
      await connectDB();
      const config = await (QuizConfig as any).findOne({}).lean();
      return config ?? DEFAULT_QUIZ_CONFIG;
    } catch {
      return DEFAULT_QUIZ_CONFIG;
    }
  },
  ["quiz-config-v1"],
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
