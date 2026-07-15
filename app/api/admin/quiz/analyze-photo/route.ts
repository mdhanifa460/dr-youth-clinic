import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import { callClaudeMessages } from "@/app/lib/ai/anthropic";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";

// Doctor-facing only — this is a triage aid a staff member requests on
// demand while reviewing a lead (mirrors summarize-note), never something
// shown to the visitor. Deliberately hedged, observational language only
// ("appears to show", never a named condition asserted as fact) — an AI
// "diagnosis" surfaced to a patient would be a real regulatory/liability
// problem for an aesthetic clinic, so this never leaves the admin panel.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB, well above the 5MB upload cap with headroom

function toResizedUrl(url: string): string {
  // Cloudinary on-the-fly transform — smaller payload/cost, same source image.
  return url.includes("/upload/") ? url.replace("/upload/", "/upload/w_800,q_auto,f_auto/") : url;
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { photoUrl, primaryConcern } = await req.json();
    // Scoped to this clinic's own Cloudinary cloud + assessment-photos folder —
    // a bare "starts with res.cloudinary.com" check would let any admin
    // session (even at 'view' level) point this at an arbitrary externally
    // hosted image and burn the clinic's Anthropic quota analyzing it.
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const expectedPrefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
    if (!photoUrl || typeof photoUrl !== "string" || !cloudName || !photoUrl.startsWith(expectedPrefix) || !photoUrl.includes("/dr-youth-clinic/assessment-photos/")) {
      return NextResponse.json({ success: false, message: "A valid uploaded photo URL is required" }, { status: 400 });
    }

    const imgRes = await fetch(toResizedUrl(photoUrl));
    if (!imgRes.ok) throw new Error("Could not fetch the uploaded photo");
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = await imgRes.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ success: false, message: "Image too large to analyze" }, { status: 400 });
    }
    const base64 = Buffer.from(buffer).toString("base64");

    const prompt = `${CLINICAL_AI_GUARDRAILS}

You are assisting a doctor at DR Youth Clinic (dermatology/aesthetic clinic in India) who is about to see a patient${primaryConcern ? ` whose stated concern is "${primaryConcern}"` : ""}. They've attached a photo the patient optionally submitted with their clinical intake.

Give the doctor 2-4 short, purely observational bullet points on what's visually apparent in the photo — texture, tone, visible redness/inflammation, apparent hair density/pattern if it's a scalp photo, etc.
- Never grade severity as clinical fact (no "Grade 3 acne", "Stage 5 hair loss", or similar staging language) — describe only what's visible.
- If the image is unclear, poorly lit, or not actually a usable skin/hair photo, say so plainly instead of guessing.
- This is a pre-consultation triage aid only — the doctor will examine the patient directly.

Return ONLY the bullet points, no preamble, no disclaimer text (the disclaimer is already shown in the UI).`;

    const analysis = await callClaudeMessages({
      maxTokens: 350,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: contentType, data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    return NextResponse.json({ success: true, data: { analysis } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Photo analysis failed" }, { status: 500 });
  }
}
