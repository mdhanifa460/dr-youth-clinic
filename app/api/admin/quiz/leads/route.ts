import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import { Lead } from "@/app/models/Lead";
import { getSettings } from "@/app/models/Settings";
import { maskPhone } from "@/app/lib/phoneMask";

// Individual AI Assessment leads for doctor/staff review — previously only
// aggregate numbers existed (Analytics tab); a doctor had no way to open a
// specific visitor's answers, gender/age, or uploaded photo before this.
export async function GET(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  await connectDB();

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Number(searchParams.get("limit") || 20));

  const [rawData, total, settings] = await Promise.all([
    (Lead as any).find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    (Lead as any).countDocuments({}),
    getSettings(),
  ]);

  const allowedPhoneRoles: string[] = settings.contactPrivacy?.showPatientPhoneRoles ?? ["super_admin", "clinic_owner", "receptionist", "customer_support"];
  const phoneMaskEnabled = settings.contactPrivacy?.phoneMaskEnabled ?? true;
  const data = rawData.map((lead: any) => ({
    ...lead,
    phone: maskPhone(lead.phone || "", user.role, allowedPhoneRoles, phoneMaskEnabled),
  }));

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// Doctor Dashboard / Doctor Review Mode edits — doctorNotes, finalRecommendation,
// and treatmentPlan are free text a doctor fills in directly; aiSummaryEditedText
// + approve together implement the review step ("doctor can review the
// AI-generated summary, adjust it if needed, and approve it"). Requires "full"
// (not just "view") since approving is the actual clinical sign-off action that
// gates care-plan generation (see /api/admin/quiz/care-plan).
export async function PATCH(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const { leadId, doctorNotes, finalRecommendation, treatmentPlan, aiSummaryEditedText, approve } = await req.json();
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ success: false, message: "leadId is required" }, { status: 400 });
    }

    const lead = await (Lead as any).findById(leadId);
    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }

    if (typeof doctorNotes === "string") lead.doctorNotes = doctorNotes;
    if (typeof finalRecommendation === "string") lead.finalRecommendation = finalRecommendation;
    if (typeof treatmentPlan === "string") lead.treatmentPlan = treatmentPlan;

    if (typeof aiSummaryEditedText === "string") {
      lead.aiSummary.editedText = aiSummaryEditedText;
    }
    if (approve === true) {
      // Require the EFFECTIVE edited text (what's on the document right
      // now, after the assignment above) to be non-empty — not just "a
      // draft exists somewhere" — so a doctor can't approve after
      // deliberately clearing the summary and have care-plan generation
      // silently fall back to the raw, never-reviewed AI draft instead.
      if (!(lead.aiSummary?.editedText || "").trim()) {
        return NextResponse.json({ success: false, message: "Summary can't be empty — write or generate one before approving" }, { status: 400 });
      }
      lead.aiSummary.status = "approved";
      lead.aiSummary.approvedAt = new Date();
      lead.aiSummary.approvedBy = user.name || user.email;
    } else if (approve === false) {
      // Explicit un-approve — a doctor asked to regenerate/re-edit after
      // already approving, so the care-plan gate must close again too.
      lead.aiSummary.status = lead.aiSummary?.draftText ? "draft" : "none";
      lead.aiSummary.approvedAt = null;
      lead.aiSummary.approvedBy = "";
    }

    await lead.save();

    return NextResponse.json({
      success: true,
      data: {
        doctorNotes: lead.doctorNotes,
        finalRecommendation: lead.finalRecommendation,
        treatmentPlan: lead.treatmentPlan,
        aiSummary: lead.aiSummary,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Update failed" }, { status: 500 });
  }
}
