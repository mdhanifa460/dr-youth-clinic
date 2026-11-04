export type BulkTargetStatus = "published" | "draft";

type PageForPlan = {
  _id: unknown;
  title?: string;
  slug?: string;
  status?: string;
  sections?: { type: string; data?: { phone?: string } }[];
  analytics?: { visitors?: number };
};

export type PlannedPage = { id: string; title: string; slug: string; visitors: number; note?: string };

export type BulkStatusPlan = {
  ready: PlannedPage[];
  alreadyThere: PlannedPage[];
  blocked: PlannedPage[];
  warnings: PlannedPage[];
};

function sectionLabel(type: string) {
  const words = type.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Decides what a bulk status change would do to each page, without doing it,
// so the preview and the real change can never disagree. `skipRequiredCheck` is
// only for Undo: a page already live before the required sections rule was
// added must be able to go back live, or Undo would leave its ads dead.
export function planStatusChange(
  pages: PageForPlan[],
  target: BulkTargetStatus,
  requiredSections: string[],
  skipRequiredCheck = false
): BulkStatusPlan {
  const plan: BulkStatusPlan = { ready: [], alreadyThere: [], blocked: [], warnings: [] };

  for (const page of pages) {
    const entry: PlannedPage = {
      id: String(page._id),
      title: page.title || page.slug || "Untitled",
      slug: page.slug || "",
      visitors: page.analytics?.visitors ?? 0,
    };

    if (page.status === target) {
      plan.alreadyThere.push(entry);
      continue;
    }

    if (target === "published") {
      const present = new Set((page.sections ?? []).map((s) => s.type));
      const missing = requiredSections.filter((t) => !present.has(t));
      if (missing.length > 0 && !skipRequiredCheck) {
        plan.blocked.push({ ...entry, note: `Missing required sections: ${missing.map(sectionLabel).join(", ")}` });
        continue;
      }
      const hero = (page.sections ?? []).find((s) => s.type === "hero");
      if (!hero?.data?.phone) {
        plan.warnings.push({ ...entry, note: "No phone number of its own, so it will show the clinic's default number" });
      }
    }

    plan.ready.push(entry);
  }

  return plan;
}
