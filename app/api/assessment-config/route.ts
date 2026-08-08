import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AssessmentConfig, { DEFAULT_ASSESSMENT_TYPES } from "@/app/models/AssessmentConfig";
import type { AssessmentTypeKey } from "@/app/lib/assessmentTypeDefaults";

export const dynamic = "force-dynamic";

// Public, unauthenticated — feeds the /skin-quiz Hair/Skin/Body flow.
// `treatmentMap` is deliberately stripped before the response leaves this
// route: it's doctor-facing-only content (names, prices, clinical fields)
// that Doctor Review Mode reads server-side elsewhere. This is the one
// enforcement point that makes "no treatment reveal before consultation"
// real rather than just a UI convention — see architecture review §02.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as AssessmentTypeKey | null;

  await connectDB();
  const doc = await (AssessmentConfig as any).findOne({}).lean();
  const types = doc?.assessmentTypes?.length ? doc.assessmentTypes : DEFAULT_ASSESSMENT_TYPES;

  // No ?type= — the body-area selector screen's list: active types only,
  // just enough to render the picker cards, no questions/scoring content.
  if (!type) {
    const active = types
      .filter((t: any) => t.active !== false)
      .sort((a: any, b: any) => a.order - b.order)
      .map((t: any) => ({ key: t.key, label: t.label, icon: t.icon, colorFrom: t.colorFrom, colorTo: t.colorTo }));
    return NextResponse.json({ success: true, data: active });
  }

  if (!["hair", "skin", "body"].includes(type)) {
    return NextResponse.json({ success: false, message: "type must be hair, skin, or body" }, { status: 400 });
  }

  const config = types.find((t: any) => t.key === type && t.active !== false);

  if (!config) {
    return NextResponse.json({ success: false, message: `No active "${type}" assessment configured` }, { status: 404 });
  }

  const { treatmentMap, ...publicConfig } = config;
  return NextResponse.json({ success: true, data: publicConfig });
}
