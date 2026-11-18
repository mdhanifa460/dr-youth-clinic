// A web story still carrying the editor's placeholder name ("Untitled Story",
// slug untitled-story-1…) is a draft-quality page: kept out of the index and
// the sitemap until an admin gives it a real title and URL. Renaming both
// makes it indexable again with no other change.
export function isPlaceholderStory(story: { title?: string | null; slug?: string | null }): boolean {
  const title = String(story.title ?? '').trim();
  const slug = String(story.slug ?? '').trim().toLowerCase();
  return /^untitled\b/i.test(title) || slug.startsWith('untitled-') || slug === 'untitled';
}
