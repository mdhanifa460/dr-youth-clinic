/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent mongoose and cloudinary from being bundled into client/edge bundles.
  // They use Node.js APIs and native bindings — bundling them breaks things and
  // adds hundreds of KB to the server bundle unnecessarily.
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'cloudinary'],
    // Runs instrumentation.ts on server start — warms MongoDB before first request.
    instrumentationHook: true,
    // Admin pages are always dynamic — never serve stale segments from the
    // client-side router cache. Public pages still get the 300s default.
    staleTimes: {
      dynamic: 0,
      static: 300,
    },
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      // Same host app/models/Video.ts already hotlinks for its auto-generated
      // thumbnail (https://img.youtube.com/vi/{id}/hqdefault.jpg) — needed
      // for next/image whenever a component's thumbnail comes straight from
      // a YouTube video id instead of an uploaded Cloudinary asset.
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],  // avif first — ~30% smaller than webp
    minimumCacheTTL: 60 * 60 * 24 * 365,   // 1 year — Cloudinary URLs are content-addressed
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,

  headers: async () => [
    // Security headers for all routes
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options',  value: 'nosniff' },
        { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection',        value: '1; mode=block' },
        { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
        // HSTS and CSP's upgrade-insecure-requests only make sense once the site is
        // actually served over HTTPS. Chromium treats `localhost` as a secure origin
        // and honors both directives there too — sending them from `next dev` (plain
        // HTTP) makes the browser force-upgrade every subresource request to HTTPS,
        // which then fails with a TLS error since the dev server has no TLS listener.
        ...(process.env.NODE_ENV === 'production'
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
          : []),
        // CSP — allow known analytics/tracking origins; unsafe-inline required by Next.js inline scripts
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            // 'unsafe-eval' is needed in dev only — Next.js dev-mode bundles use eval()
            // for Fast Refresh / source maps, and without it the CSP silently blocks
            // all client JS from executing, so the app never hydrates (no onClick
            // handlers attach anywhere). Production bundles don't use eval().
            `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval' "}https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.clarity.ms https://static.hotjar.com https://www.youtube.com`,
            "style-src 'self' 'unsafe-inline'",
            // img.youtube.com/i.ytimg.com serve the hotlinked thumbnail Video.ts
            // auto-generates from a youtubeId (see the pre('save') hook) whenever
            // an admin hasn't uploaded a custom Cloudinary thumbnail — without
            // these origins, any video relying on that default silently shows
            // a broken image.
            // https://*.google-analytics.com (wildcard, not the bare www. host) and
            // https://*.g.doubleclick.net / https://www.google.com — added per Google
            // Tag Assistant's own live CSP diagnostic against production (stats.g.
            // doubleclick.net and google.com image-beacon pixels used by GA4/Google
            // Ads conversion tracking, not covered by the narrower hosts already
            // here). Matches Google's own published Tag CSP guidance, which
            // recommends the wildcard specifically because GA4 sends hits to
            // dynamic regional subdomains (e.g. region1.google-analytics.com) that
            // a bare hostname doesn't cover.
            // https://www.google.co.in (ads/ga-audiences) is a separate,
            // country-specific host from https://www.google.com already
            // below — a CSP host-source match is exact-host, not
            // TLD-agnostic, so the existing .com entry doesn't cover it.
            "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com https://*.google-analytics.com https://www.googletagmanager.com https://*.g.doubleclick.net https://www.google.com https://www.google.co.in https://www.facebook.com https://img.youtube.com https://i.ytimg.com",
            "font-src 'self' data:",
            // ad.doubleclick.net (Google Ads conversion collect endpoint,
            // /cm/s/collect) is a DIFFERENT hostname from g.doubleclick.net —
            // the existing https://*.g.doubleclick.net wildcard only matches
            // subdomains of g.doubleclick.net and does not cover this one.
            // Added per Tag Assistant's own exact reported block. Everything
            // else on this line is unchanged.
            // https://analytics.google.com (bare apex, the GA4 /g/collect
            // endpoint) is NOT matched by the *.analytics.google.com
            // wildcard already below — a CSP wildcard host-source only
            // matches subdomains, never the bare domain itself. Both stay,
            // since real traffic uses both forms.
            "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://analytics.google.com https://www.googletagmanager.com https://*.g.doubleclick.net https://ad.doubleclick.net https://www.google.com https://connect.facebook.net https://www.clarity.ms https://www.hotjar.com https://vc.hotjar.io https://api.cloudinary.com https://graph.facebook.com",
            "media-src 'self' https://res.cloudinary.com",
            // youtube-nocookie.com is the privacy-enhanced embed domain some
            // browsers/extensions rewrite youtube.com embeds to — allow both so
            // a visitor's own privacy settings can't reintroduce this block.
            "frame-src https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
          ].join('; '),
        },
      ],
    },
    // Static assets — immutable, 1 year
    {
      source: '/_next/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/fonts/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/images/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    // Admin pages — never cache HTML; browser must always re-fetch from server.
    // This prevents stale HTML referencing old JS chunk hashes after a rebuild.
    {
      source: '/admin/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        { key: 'Pragma',        value: 'no-cache' },
      ],
    },
    // Admin API responses — never cache; always fresh data
    {
      source: '/api/admin/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        { key: 'Pragma',        value: 'no-cache' },
      ],
    },
    // Public HTML pages — ETag-validate on every browser request (max-age=0),
    // so browsers never serve stale HTML with outdated JS chunk hashes.
    // CDN edge caches the rendered page for 5 min (s-maxage=300, matching ISR
    // revalidate) and can serve stale for 10 min while revalidating in background.
    // This is the same strategy used by Vercel, Stripe docs, and next.js.org:
    // browser always revalidates cheaply (304 if unchanged), CDN absorbs load.
    {
      source: '/((?!_next|api|admin|favicon\\.ico|images|fonts).*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
      ],
    },
    // Public API responses — CDN-cacheable for 60s, serve stale for up to 5min
    {
      source: '/api/reviews',
      headers: [{ key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' }],
    },
    {
      source: '/api/locations/:city',
      headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
    },
    {
      source: '/api/homepage',
      headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
    },
  ],
};

module.exports = nextConfig;
