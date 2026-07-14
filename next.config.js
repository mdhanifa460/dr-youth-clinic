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
            `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval' "}https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.clarity.ms https://static.hotjar.com`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com",
            "font-src 'self' data:",
            "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://www.clarity.ms https://www.hotjar.com https://vc.hotjar.io https://api.cloudinary.com https://graph.facebook.com",
            "media-src 'self' https://res.cloudinary.com",
            "frame-src https://www.google.com https://maps.google.com",
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
