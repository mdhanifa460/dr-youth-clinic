// Must match the `category` enum in app/models/Blog.ts exactly.
export const BLOG_CATEGORIES = ['Hair Care', 'Skin Care', 'Laser', 'Aesthetics', 'General'] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const CATEGORY_COLOR: Record<string, string> = {
  'Hair Care': 'bg-emerald-700',
  'Skin Care': 'bg-rose-700',
  'Laser': 'bg-violet-700',
  'Aesthetics': 'bg-amber-700',
  'General': 'bg-[#2A6BA8]',
};
