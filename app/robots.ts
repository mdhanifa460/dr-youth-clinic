import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

// AI answer-engine crawlers that can actually cite this site in a ChatGPT/
// Claude/Perplexity/Google AI Overview response — the whole point of GEO
// (Generative Engine Optimization) is to be visible to these, so listing
// them explicitly (even though the generic '*' rule below already allows
// them implicitly) makes the intent an explicit, deliberate policy rather
// than an accident of the default, and gives a single place to change our
// mind about one specific crawler later without touching the rest.
const AI_CRAWLERS = [
  'GPTBot',        // OpenAI training + browsing
  'ChatGPT-User',  // OpenAI live browsing on a user's behalf
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended', // Gemini / AI Overviews training opt-in
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/lp/'],
        disallow: ['/admin', '/api'],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: ['/', '/lp/'],
        disallow: ['/admin', '/api'],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
