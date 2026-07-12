// Canonical section shape shared by every page-builder surface (Landing
// Pages, Homepage, About). Each system's own storage stays as-is (Homepage
// keeps one Mongo document per section, Landing Pages/About keep an array
// in one document) — this type is the shared shape the admin UI and public
// renderers operate on, not a forced storage migration.
export interface BuilderSection {
  id: string;
  type: string;
  visible: boolean;
  data: Record<string, any>;
}

export interface SectionTypeDef {
  type: string;
  label: string;
  icon: string;
  defaultData: Record<string, any>;
}

// A short, honest "preview" string pulled from whatever text field a
// section's data happens to have — not a rendered screenshot (no screenshot
// pipeline exists in this codebase), just enough to tell sections apart at a
// glance in the builder list.
export function previewText(data: Record<string, any>): string {
  const candidates = ['headline', 'title', 'heading', 'question', 'name', 'text'];
  for (const key of candidates) {
    const val = data?.[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return '';
}
