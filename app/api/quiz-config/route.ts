import { NextResponse } from "next/server";
import { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import { getCachedQuizConfig } from "@/app/lib/quizConfig.server";

export const revalidate = 300;

export async function GET() {
  try {
    const config = await getCachedQuizConfig();
    return NextResponse.json({ success: true, data: config });
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_QUIZ_CONFIG });
  }
}
