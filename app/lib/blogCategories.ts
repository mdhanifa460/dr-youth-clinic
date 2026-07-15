// Must match the `category` enum in app/models/Blog.ts exactly.
export const BLOG_CATEGORIES = ['Hair Care', 'Skin Care', 'Laser', 'Aesthetics', 'General'] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const CATEGORY_COLOR: Record<string, string> = {
  'Hair Care': 'bg-emerald-500',
  'Skin Care': 'bg-rose-500',
  'Laser': 'bg-violet-500',
  'Aesthetics': 'bg-amber-500',
  'General': 'bg-[#3B82C4]',
};
