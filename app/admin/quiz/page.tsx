import { redirect } from "next/navigation";

// Renamed to /admin/ai-assessment (Marketing → AI Assessment) — kept as a
// redirect so any existing bookmarks don't 404.
export default function LegacyQuizRedirect() {
  redirect("/admin/ai-assessment");
}
