import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPlaceholderStory } from '@/app/lib/storySeo';

// In-memory stand-ins for each model's find().select().lean() chain.
const data: Record<string, any[]> = {};
const chain = (rows: () => any[]) => ({ select: () => ({ lean: async () => rows() }) });
const model = (key: string) => ({ find: () => chain(() => data[key] || []) });

vi.mock('@/app/lib/mongodb', () => ({ connectDB: async () => {} }));
vi.mock('@/app/models/Service', () => ({ Service: model('services') }));
vi.mock('@/app/models/Doctor', () => ({ Doctor: model('doctors') }));
vi.mock('@/app/models/Blog', () => ({ Blog: model('blogs') }));
vi.mock('@/app/models/LandingPage', () => ({ LandingPage: model('lps') }));
vi.mock('@/app/models/Story', () => ({ Story: model('stories') }));
vi.mock('@/app/models/Result', () => ({ Result: model('results'), PUBLISHED_RESULT: {} }));
vi.mock('@/app/models/Video', () => ({ Video: model('videos') }));
vi.mock('@/app/models/Course', () => ({ Course: model('courses') }));
vi.mock('@/app/models/LocationContent', () => ({
  LocationContent: { find: () => ({ distinct: async () => data.noindexCities || [] }) },
}));

const { getSiteUrlInventory } = await import('@/app/lib/siteUrlInventory');

async function listed(): Promise<Set<string>> {
  const all = await getSiteUrlInventory();
  return new Set(all.filter((e) => !e.excludeFromSitemap).map((e) => e.path));
}

beforeEach(() => {
  for (const k of Object.keys(data)) delete data[k];
});

describe('sitemap: city category pages', () => {
  it('lists a city category only when that city has a treatment in it', async () => {
    data.services = [
      { name: 'PRP', urlSlug: 'hair-prp', category: 'Hair', location: 'all' },
      { name: 'Botox', urlSlug: 'botox', category: 'Skin', location: 'chennai' },
      { name: 'Lipo', urlSlug: 'lipo', category: 'Other', targetLocations: ['kochi'], location: 'all' },
    ];
    const paths = await listed();
    for (const city of ['chennai', 'bangalore', 'kochi', 'coimbatore']) expect(paths.has(`/${city}/services/hair`)).toBe(true);
    expect(paths.has('/chennai/services/skin')).toBe(true);
    expect(paths.has('/bangalore/services/skin')).toBe(false);
    expect(paths.has('/kochi/services/other')).toBe(true);
    // targetLocations wins over location 'all', exactly like the page query
    expect(paths.has('/chennai/services/other')).toBe(false);
    expect(paths.has('/chennai/services/laser')).toBe(false);
  });

  it('keeps the city and city-services pages regardless', async () => {
    const paths = await listed();
    expect(paths.has('/kochi')).toBe(true);
    expect(paths.has('/kochi/services')).toBe(true);
  });
});

describe('sitemap: city blog lists', () => {
  it('lists /{city}/blog only for cities with a post', async () => {
    data.blogs = [{ slug: 'gfc-vs-prp', title: 'GFC vs PRP', targetLocations: ['kochi'] }];
    const paths = await listed();
    expect(paths.has('/kochi/blog')).toBe(true);
    expect(paths.has('/chennai/blog')).toBe(false);
  });
});

describe('sitemap: hidden city pages and placeholder stories', () => {
  it('drops a city page set to noindex', async () => {
    data.noindexCities = ['coimbatore'];
    const paths = await listed();
    expect(paths.has('/coimbatore')).toBe(false);
    expect(paths.has('/chennai')).toBe(true);
  });

  it('drops web stories still named Untitled', async () => {
    data.stories = [
      { slug: 'untitled-story', title: 'Untitled Story' },
      { slug: 'untitled-story-1microblading-beautiful-natural-looking-brows', title: 'Microblading' },
      { slug: 'prp-hair-1', title: 'PRP for hair' },
    ];
    const paths = await listed();
    expect(paths.has('/web-stories/untitled-story')).toBe(false);
    expect(paths.has('/web-stories/untitled-story-1microblading-beautiful-natural-looking-brows')).toBe(false);
    expect(paths.has('/web-stories/prp-hair-1')).toBe(true);
  });
});

describe('isPlaceholderStory', () => {
  it('flags an Untitled title or an untitled- slug only', () => {
    expect(isPlaceholderStory({ title: 'Untitled Story', slug: 'abc' })).toBe(true);
    expect(isPlaceholderStory({ title: 'Real title', slug: 'untitled-story-1' })).toBe(true);
    expect(isPlaceholderStory({ title: 'Real title', slug: 'real-title' })).toBe(false);
    expect(isPlaceholderStory({ title: 'Untitledness explained', slug: 'x' })).toBe(false);
  });
});
