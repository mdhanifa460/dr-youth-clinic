'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const TOOLS = [
  {
    icon: '🎯',
    name: 'Google Ads',
    purpose: 'Paid patient acquisition',
    desc: 'Run search ads when people Google "laser hair removal Chennai" or "acne treatment Bangalore". You only pay when someone clicks.',
    highlight: 'Highest ROI for new patient acquisition',
    color: 'blue',
    steps: [
      'Create a campaign at ads.google.com',
      'Target keywords like your treatment names + city',
      'Set your budget (start ₹500–₹1000/day)',
      'Link to your GA4 to track bookings as conversions',
    ],
    link: 'https://ads.google.com',
    linkLabel: 'Open Google Ads →',
  },
  {
    icon: '📊',
    name: 'Google Analytics 4 (GA4)',
    purpose: 'User behaviour & conversions',
    desc: 'See which pages visitors land on, how long they stay, and which ones book. Set up booking confirmation as a conversion event.',
    highlight: 'Already wired in Analytics & Tracking settings',
    color: 'orange',
    steps: [
      'Set your GA4 Measurement ID in Analytics & Tracking',
      'Create a conversion event for /book/confirmed page visits',
      'Connect GA4 to Google Ads for closed-loop attribution',
      'Check the Acquisition report weekly',
    ],
    link: '/admin/settings/analytics',
    linkLabel: 'Go to Analytics Settings →',
    internal: true,
  },
  {
    icon: '🏷️',
    name: 'Google Tag Manager (GTM)',
    purpose: 'Manage all tags without code changes',
    desc: 'Add and update tracking pixels (GA4, Meta, Clarity, Google Ads conversion tags) from one dashboard — no developer needed after initial setup.',
    highlight: 'Set once, manage forever without code changes',
    color: 'blue',
    steps: [
      'Create a GTM container at tagmanager.google.com',
      'Add your GTM Container ID in Analytics & Tracking settings',
      'Use GTM to fire GA4 events, Meta Pixel events, and Google Ads conversion tags',
      'GTM replaces the need to add separate script tags',
    ],
    link: '/admin/settings/analytics',
    linkLabel: 'Go to Analytics Settings →',
    internal: true,
  },
  {
    icon: '🔍',
    name: 'Google Search Console',
    purpose: 'SEO monitoring',
    desc: 'See which Google searches bring people to your site, fix crawl errors, submit your sitemap, and monitor your keyword rankings.',
    highlight: 'Free — essential for SEO visibility',
    color: 'green',
    steps: [
      'Add your site at search.google.com/search-console',
      'Verify ownership using your GA4 ID (automatic if GA4 is set up)',
      'Or paste your verification code in Analytics & Tracking settings',
      'Submit your sitemap.xml for faster Google indexing',
    ],
    link: '/admin/settings/analytics',
    linkLabel: 'Go to Analytics Settings →',
    internal: true,
  },
  {
    icon: '📘',
    name: 'Meta (Facebook & Instagram) Pixel',
    purpose: 'Social media retargeting',
    desc: 'Track visitors who came from your Instagram/Facebook ads, build retargeting audiences, and measure cost per booking from Meta campaigns.',
    highlight: 'Essential for Instagram and Facebook ad campaigns',
    color: 'indigo',
    steps: [
      'Create a Pixel in Meta Business Suite → Events Manager',
      'Add your Pixel ID in Analytics & Tracking settings',
      'Set up Standard Events: ViewContent, Lead, CompleteRegistration',
      'Use Custom Audiences to retarget visitors who viewed services',
    ],
    link: '/admin/settings/analytics',
    linkLabel: 'Go to Analytics Settings →',
    internal: true,
  },
  {
    icon: '🎥',
    name: 'Microsoft Clarity',
    purpose: 'Heatmaps & session recordings',
    desc: 'Watch recordings of real patient journeys on your site. See exactly where they scroll, click, and drop off — then fix those pages.',
    highlight: 'Free forever — no limits on recordings',
    color: 'cyan',
    steps: [
      'Create a project at clarity.microsoft.com (free)',
      'Add your Project ID in Analytics & Tracking settings',
      'Watch session recordings to find booking drop-off points',
      'Use heatmaps to see what CTAs get the most attention',
    ],
    link: '/admin/settings/analytics',
    linkLabel: 'Go to Analytics Settings →',
    internal: true,
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-50 border-blue-100 text-blue-700',
  orange: 'bg-orange-50 border-orange-100 text-orange-700',
  green:  'bg-green-50 border-green-100 text-green-700',
  indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  cyan:   'bg-cyan-50 border-cyan-100 text-cyan-700',
};

export default function PaidMarketingPage() {
  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Settings
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0B2560]">Marketing Stack</h1>
          <p className="text-gray-400 text-sm mt-1">
            Your recommended professional marketing toolkit — no display ads, just real patient acquisition.
          </p>
        </div>

        {/* Why not AdSense banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-8 flex gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">Google AdSense has been removed</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Display ads from AdSense make your clinic look unprofessional, slow down your pages, and earn negligible revenue (~₹50–200/month for a clinic site). Instead, every ₹1 of marketing budget should go into Google Ads and Meta Ads — which bring you actual bookings, not banner clicks.
            </p>
          </div>
        </div>

        {/* Tool cards */}
        <div className="space-y-4">
          {TOOLS.map((tool) => (
            <div key={tool.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl shrink-0">{tool.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-[#0B2560] text-base">{tool.name}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_MAP[tool.color]}`}>
                        {tool.purpose}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{tool.desc}</p>
                  </div>
                </div>

                {/* Highlight */}
                <div className="bg-[#f0f7ff] border border-blue-100 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
                  <span className="text-[#3B82C4]">✓</span>
                  <p className="text-xs font-semibold text-[#0B2560]">{tool.highlight}</p>
                </div>

                {/* Steps */}
                <ol className="space-y-1.5 mb-4">
                  {tool.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                      <span className="w-4 h-4 rounded-full bg-[#0B2560] text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                {/* CTA */}
                {tool.internal ? (
                  <Link
                    href={tool.link}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82C4] hover:text-[#0B2560] transition"
                  >
                    {tool.linkLabel}
                  </Link>
                ) : (
                  <a
                    href={tool.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82C4] hover:text-[#0B2560] transition"
                  >
                    {tool.linkLabel} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ROI summary */}
        <div className="mt-8 bg-gradient-to-br from-[#0B2560] to-[#1a3a7a] rounded-2xl p-6 text-white">
          <h3 className="font-bold text-base mb-3">Recommended monthly budget split</h3>
          <div className="space-y-2">
            {[
              { label: 'Google Ads (Search)', pct: '50%', note: 'Target high-intent treatment searches' },
              { label: 'Meta Ads (Instagram/Facebook)', pct: '30%', note: 'Brand awareness + retargeting' },
              { label: 'SEO & Content (blog, FAQs)', pct: '20%', note: 'Long-term organic traffic' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#F5A623] font-bold text-sm w-10 shrink-0">{row.pct}</span>
                  <div>
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="text-[10px] text-white/50">{row.note}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
