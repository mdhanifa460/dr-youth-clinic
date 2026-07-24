import { redirect } from "next/navigation";

// Merged into the AI Management module — this page's entire content (Clinic
// Identity, Greeting, Prompts, Model, Theme, Suggested Questions, Quick
// Actions, Feature toggles) now lives at /admin/ai's "Chatbot Settings" tab
// and siblings. Redirect rather than 404 for anyone with the old URL bookmarked.
export default function LegacyAiSettingsRedirect() {
  redirect("/admin/ai");
}
