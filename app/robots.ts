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

// Read-only addresses public pages call as they load (footer branch contact,
// WhatsApp button, testimonials). Google must be able to fetch these to
// render a page fully; otherwise the Rich Results Test / URL Inspection
// reports the page as "partially loaded, blocked by robots.txt". The more
// specific Allow wins over "Disallow: /api" for Google. Everything else
// under /api (forms, bookings, admin) stays blocked, and every /api response
// carries X-Robots-Tag: noindex (next.config.js) so none is ever indexed.
export const RENDER_API_ALLOW = ['/api/branch-contact', '/api/branch-whatsapp', '/api/reviews'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/lp/', ...RENDER_API_ALLOW],
        disallow: ['/admin', '/api'],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: ['/', '/lp/', ...RENDER_API_ALLOW],
        disallow: ['/admin', '/api'],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
