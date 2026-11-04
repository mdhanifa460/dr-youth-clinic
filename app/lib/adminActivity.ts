import { headers } from "next/headers";
import { connectDB } from "./mongodb";
import AdminActivityLog from "../models/AdminActivityLog";

type Actor = { _id?: string; name?: string; email: string; role?: string };

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Records a data-changing admin request. Runs before the route does its work,
// so "allowed" means the person was permitted to try, not that it succeeded.
// Method, path and query come from headers middleware.ts sets itself, so a
// client can't fake them. A logging failure must never block the admin's
// actual work, hence the catch.
export async function recordAdminActivity({
  actor,
  module = "",
  outcome = "allowed",
  details = "",
}: {
  actor: Actor;
  module?: string;
  outcome?: "allowed" | "denied" | "failed_login";
  details?: string;
}) {
  try {
    const h = headers();
    const method = h.get("x-admin-method");
    if (!method || READ_ONLY_METHODS.has(method)) return;

    await connectDB();
    await AdminActivityLog.create({
      actorId: actor._id ?? null,
      actorName: actor.name ?? "",
      actorEmail: actor.email.slice(0, 200),
      actorRole: actor.role ?? "",
      method,
      path: h.get("x-pathname") ?? "",
      query: (h.get("x-admin-search") ?? "").slice(0, 200),
      module,
      details: details.slice(0, 1000),
      outcome,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "",
      userAgent: (h.get("user-agent") ?? "").slice(0, 300),
    });
  } catch (err: any) {
    console.error("Failed to record admin activity:", err?.message);
  }
}
