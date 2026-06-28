/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent mongoose and cloudinary from being bundled into client/edge bundles.
  // They use Node.js APIs and native bindings — bundling them breaks things and
  // adds hundreds of KB to the server bundle unnecessarily.
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'cloudinary'],
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
        { key: 'X-Content-Type-Options',            value: 'nosniff' },
        { key: 'X-Frame-Options',                   value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection',                  value: '1; mode=block' },
        { key: 'Referrer-Policy',                   value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',                value: 'camera=(), microphone=(), geolocation=()' },
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
