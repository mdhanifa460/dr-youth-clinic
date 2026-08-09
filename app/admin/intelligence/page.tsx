import { redirect } from "next/navigation";

// Split into three pages (architecture review, Aug 2026): the old single
// "AI Intelligence" page mixed 14 sections that were mostly Business/
// Marketing Intelligence (facts) with a handful of genuine AI Intelligence
// (insight/recommendation) sections. See:
//   /admin/business-intelligence  — operations facts
//   /admin/marketing-intelligence — acquisition facts
//   /admin/ai-intelligence        — advisor/forecast/alerts (insights)
// Kept as a redirect so any existing bookmarks don't 404 — same pattern as
// /admin/quiz -> /admin/ai-assessment.
export default function LegacyIntelligenceRedirect() {
  redirect("/admin/business-intelligence");
}
