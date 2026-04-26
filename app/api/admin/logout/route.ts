import { clearAdminSessionCookie, parseSignedSessionCookie } from "@/app/lib/adminAuth";
import { connectDB } from "@/app/lib/mongodb";
import AdminSession from "@/app/models/AdminSession";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AdminSessionModel = AdminSession as {
  findOne: (query: unknown) => Promise<{
    revokedAt?: Date;
    save: () => Promise<unknown>;
  } | null>;
};

export async function POST() {
  const res = NextResponse.json({ success: true });
  const sessionId = parseSignedSessionCookie(
    cookies().get("admin_session")?.value
  );

  if (sessionId) {
    await connectDB();
    const session = await AdminSessionModel.findOne({
      sessionHash: createHash("sha256").update(sessionId).digest("hex"),
      revokedAt: { $exists: false },
    });

    if (session) {
      session.revokedAt = new Date();
      await session.save();
    }
  }

  clearAdminSessionCookie(res);

  return res;
}
