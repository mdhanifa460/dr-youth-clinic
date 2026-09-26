import { NextRequest, NextResponse } from "next/server";
import { generateChat, isConfiguredProviderReady } from "@/app/lib/ai";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { connectDB } from "@/app/lib/mongodb";
import { getJourneyConfig } from "@/app/models/JourneyConfig";

// Public, unauthenticated — the first patient-facing AI photo analysis in
// this codebase. Every other AI photo route here
// (app/api/admin/quiz/analyze-photo) is deliberately admin-only, per an
// explicit design comment there: "an AI 'diagnosis' surfaced to a patient
// would be a real regulatory/liability problem." This route exists
// specifically to do that safely, mirroring analyze-photo's proven
// fetch-resize-base64-guardrails mechanics, but with a stricter prompt
// (plain language, no clinical terms, no severity language at all) since
// the reader here is the patient themselves, not a doctor who already
// knows to treat the output as a triage aid.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB, well above the 5MB upload cap with headroom

function toResizedUrl(url: string): string {
  // Cloudinary on-the-fly transform — smaller payload/cost, same source image.
  return url.includes("/upload/") ? url.replace("/upload/", "/upload/w_800,q_auto,f_auto/") : url;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`patient-observations:${ip}`, 8, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  if (!isConfiguredProviderReady()) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    await connectDB();
    const config = await getJourneyConfig();
    if (!config.enableAiObservations) {
      return NextResponse.json({ success: false, message: "AI Observations is currently unavailable" }, { status: 403 });
    }

    const body = await req.json();
    const { goalLabel, disclaimerAcknowledged } = body;
    // Accepts one photo (legacy `photoUrl`) or up to 4 guided-angle photos.
    const rawUrls: unknown[] = Array.isArray(body.photoUrls) ? body.photoUrls : [body.photoUrl];
    const photoUrls = rawUrls.filter((u): u is string => typeof u === "string").slice(0, 4);
    const angles: string[] = Array.isArray(body.angles) ? body.angles.map((a: unknown) => String(a).slice(0, 30)) : [];

    // The UI gates the request button on this same checkbox, but a public
    // POST route can be called directly — the disclaimer acknowledgment is
    // the actual safety gate, not a UI nicety, so it's re-checked here.
    if (disclaimerAcknowledged !== true) {
      return NextResponse.json({ success: false, message: "Please acknowledge the disclaimer first" }, { status: 400 });
    }

    // Scoped to this clinic's own Cloudinary cloud + assessment-photos
    // folder — same check as analyze-photo, so this route can't be pointed
    // at an arbitrary externally hosted image to burn the clinic's AI quota.
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const expectedPrefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
    const validUrl = (u: string) =>
      !!cloudName && u.startsWith(expectedPrefix) && u.includes("/dr-youth-clinic/assessment-photos/");
    if (photoUrls.length === 0 || !photoUrls.every(validUrl)) {
      return NextResponse.json({ success: false, message: "A valid uploaded photo is required" }, { status: 400 });
    }

    const imageBlocks: any[] = [];
    let totalBytes = 0;
    for (const u of photoUrls) {
      const imgRes = await fetch(toResizedUrl(u));
      if (!imgRes.ok) throw new Error("Could not fetch the uploaded photo");
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      const buffer = await imgRes.arrayBuffer();
      totalBytes += buffer.byteLength;
      if (buffer.byteLength > MAX_IMAGE_BYTES || totalBytes > MAX_IMAGE_BYTES * 2) {
        return NextResponse.json({ success: false, message: "Image too large to analyze" }, { status: 400 });
      }
      imageBlocks.push({ type: "image", source: { type: "base64", media_type: contentType, data: Buffer.from(buffer).toString("base64") } });
    }
    const angleNote = photoUrls.length > 1
      ? `\nThe ${photoUrls.length} photos are in order${angles.length ? `: ${angles.slice(0, photoUrls.length).join(", ")}` : ""}. Consider them together as views of the same person.`
      : "";

    const safeGoalLabel = typeof goalLabel === "string" ? goalLabel.slice(0, 60) : "their goal";

    const prompt = `${CLINICAL_AI_GUARDRAILS}

You are giving a PATIENT (not a doctor) general, friendly observations about their own photo(s), submitted as part of an AI-guided treatment journey for "${safeGoalLabel}" at DR Youth Clinic. This text goes directly to the patient, who has already seen and acknowledged that this is not a diagnosis.

Write 2-3 short, warm, general sentences about what's visibly apparent in the photo — plain everyday language, never medical or clinical terminology.
- Never name or imply a specific medical condition, disease, or diagnosis, even in hedged form.
- Never grade, score, or stage severity in any way.
- Never recommend a specific treatment or product — that decision belongs to the doctor at consultation.
- Keep the tone encouraging and non-alarming — this should help the patient feel informed, never worried.
- If the image is unclear, poorly lit, or doesn't show a usable skin/hair area, say so plainly and suggest a retake, instead of guessing at what it shows.

Return ONLY the observations as 2-4 plain sentences — no bullet points, no headings, no disclaimer text (the disclaimer is already shown in the UI).${angleNote}`;

    const analysis = await generateChat(
      [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: prompt },
          ],
        },
      ],
      { maxTokens: 300 }
    );

    return NextResponse.json({ success: true, data: { text: analysis } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Could not generate observations" }, { status: 500 });
  }
}
