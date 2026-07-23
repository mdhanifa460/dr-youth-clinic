import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';
import { StoryType } from '../app/models/StoryType';
import { Faq } from '../app/models/Faq';
import { HomepageSection } from '../app/models/HomepageSection';
import { flattenStaticFaqs } from '../app/lib/rag/staticFaqs';

const DEFAULT_STORY_TYPES: { name: string; icon: string; order: number }[] = [
  { name: 'Hair Stories', icon: '💇', order: 1 },
  { name: 'Skin Stories', icon: '✨', order: 2 },
  { name: 'Anti-Aging', icon: '🌿', order: 3 },
  { name: 'PRP', icon: '💉', order: 4 },
  { name: 'Hair Transplant', icon: '🌱', order: 5 },
  { name: 'Laser Hair Reduction', icon: '⚡', order: 6 },
  { name: 'Acne Treatment', icon: '🧴', order: 7 },
  { name: 'Before & After', icon: '↔️', order: 8 },
  { name: 'Offers', icon: '🏷️', order: 9 },
  { name: 'Doctor Tips', icon: '👨‍⚕️', order: 10 },
  { name: 'Patient Journey', icon: '🛤️', order: 11 },
  { name: 'Treatment Explainers', icon: '📖', order: 12 },
  { name: 'Events', icon: '📅', order: 13 },
  { name: 'Health Tips', icon: '💡', order: 14 },
  { name: 'Announcements', icon: '📢', order: 15 },
];

async function seedStoryTypes() {
  const existing = await StoryType.countDocuments();
  if (existing > 0) {
    console.log(`StoryType: ${existing} already exist — skipped`);
    return;
  }
  await StoryType.insertMany(DEFAULT_STORY_TYPES.map((t) => ({ ...t, active: true })) as any);
  console.log(`StoryType: seeded ${DEFAULT_STORY_TYPES.length} defaults`);
}

async function seedWebStoriesSection() {
  const existing = await HomepageSection.findOne({ sectionKey: 'web_stories' } as any);
  if (existing) {
    console.log('HomepageSection(web_stories): already exists — skipped');
    return;
  }
  const maxOrder = await HomepageSection.findOne({} as any).sort({ order: -1 }).select('order').lean();
  await HomepageSection.create({
    sectionKey: 'web_stories',
    label: 'Web Stories',
    order: ((maxOrder as any)?.order ?? 9) + 0.1,
    visible: true,
    data: {
      headline: 'Web Stories',
      subheadline: 'Quick visual stories on treatments, transformations, and offers.',
    },
  });
  console.log('HomepageSection(web_stories): created');
}

async function migrateFaqs() {
  const existing = await Faq.countDocuments();
  if (existing > 0) {
    console.log(`Faq: ${existing} already exist — skipped`);
    return;
  }
  const faqSection = await HomepageSection.findOne({ sectionKey: 'faq' } as any).lean();
  const cmsFaqs = ((faqSection as any)?.data?.faqs ?? []) as { question: string; answer: string; category?: string }[];
  const staticFaqs = flattenStaticFaqs();

  const seen = new Set<string>();
  const merged: { question: string; answer: string; category: string; order: number }[] = [];
  let order = 0;
  for (const f of [...cmsFaqs, ...staticFaqs]) {
    if (seen.has(f.question)) continue;
    seen.add(f.question);
    merged.push({ question: f.question, answer: f.answer, category: f.category || 'General', order: order++ });
  }

  await Faq.insertMany(merged as any);
  console.log(`Faq: migrated ${merged.length} FAQs from static + CMS sources`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required in .env.local');
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME || 'clinicDB' });
  await seedStoryTypes();
  await seedWebStoriesSection();
  await migrateFaqs();
  console.log('Done.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
