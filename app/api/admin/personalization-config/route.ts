import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { PersonalizationConfig, getPersonalizationConfig } from "@/app/models/PersonalizationConfig";

export const dynamic = "force-dynamic";

// Reuses the existing "settings" permission module — same population that
// manages Homepage Personalization's Phase 1 master toggle
// (/admin/settings/personalization) now also manages the full Phase 2
// scoring config from the same page.
export async function GET() {
  const denied = await requirePermission("settings", "view");
  if (denied) return denied;

  await connectDB();
  const config = await getPersonalizationConfig();
  return NextResponse.json({ success: true, data: config });
}

// Full-document replace, same shape the GET returns — the admin UI holds
// the whole config in state and PUTs it back, same convention as
// assessment-config's per-type PUT.
export async function PUT(req: NextRequest) {
  const denied = await requirePermission("settings", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { categories, eventWeights, decayHalfLifeDays, primaryThreshold, secondaryThreshold, maxCategories, scoreSaturationPoint, confidenceBands, sections } = body;

  if (!Array.isArray(categories) || !Array.isArray(eventWeights) || !Array.isArray(sections) || !Array.isArray(confidenceBands)) {
    return NextResponse.json({ success: false, message: "categories, eventWeights, confidenceBands, and sections must all be arrays" }, { status: 400 });
  }
  if (primaryThreshold < secondaryThreshold) {
    return NextResponse.json({ success: false, message: "Primary threshold must be greater than or equal to secondary threshold" }, { status: 400 });
  }

  let doc = await (PersonalizationConfig as any).findOne({});
  const next = { categories, eventWeights, decayHalfLifeDays, primaryThreshold, secondaryThreshold, maxCategories, scoreSaturationPoint, confidenceBands, sections };

  if (!doc) {
    doc = await (PersonalizationConfig as any).create(next);
  } else {
    Object.assign(doc, next);
    await doc.save();
  }

  revalidateTag("personalization-config");
  return NextResponse.json({ success: true, data: doc });
}
