import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import AssessmentConfig, { DEFAULT_ASSESSMENT_TYPES } from "@/app/models/AssessmentConfig";
import type { AssessmentTypeKey } from "@/app/lib/assessmentTypeDefaults";

export const dynamic = "force-dynamic";

// Reuses the existing "ai-assessment" permission module (app/lib/permissions.ts)
// rather than adding a new one — same admin population already manages the
// legacy Clinical Intake / Plan My Journey config under that module.
async function getOrCreateConfig() {
  let doc = await (AssessmentConfig as any).findOne({});
  if (!doc) {
    doc = await (AssessmentConfig as any).create({ assessmentTypes: DEFAULT_ASSESSMENT_TYPES });
  }
  return doc;
}

export async function GET(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  await connectDB();
  const type = req.nextUrl.searchParams.get("type") as AssessmentTypeKey | null;
  const doc = await getOrCreateConfig();

  if (!type) return NextResponse.json({ success: true, data: doc.assessmentTypes });

  const config = doc.assessmentTypes.find((t: any) => t.key === type);
  if (!config) return NextResponse.json({ success: false, message: `No "${type}" config found` }, { status: 404 });
  return NextResponse.json({ success: true, data: config });
}

// Replaces one type's full config (Questions / Scoring & Results / Treatment
// Mapping tabs all PUT here together) — the admin UI sends the complete
// type-config object back, this swaps it into the array by key.
export async function PUT(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { type, config } = body;

  if (!type || !["hair", "skin", "body"].includes(type) || !config) {
    return NextResponse.json({ success: false, message: "type and config are required" }, { status: 400 });
  }

  const doc = await getOrCreateConfig();
  const index = doc.assessmentTypes.findIndex((t: any) => t.key === type);

  const nextEntry = {
    ...config,
    key: type,
    version: (config.version || 1) + (index === -1 ? 0 : 1),
  };

  if (index === -1) {
    doc.assessmentTypes.push(nextEntry);
  } else {
    doc.assessmentTypes[index] = nextEntry;
  }
  await doc.save();

  return NextResponse.json({ success: true, data: doc.assessmentTypes.find((t: any) => t.key === type) });
}
