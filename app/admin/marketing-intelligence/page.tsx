'use client';

// Facts about marketing/acquisition — traffic, campaigns, leads, ROI, SEO,
// AI-search visibility, competitors. Answers "what happened?" Split out of
// the old single "AI Intelligence" page (architecture review, Aug 2026):
// none of these four sections are AI-generated, they're Marketing
// Intelligence — see AI Intelligence (/admin/ai-intelligence) for the
// advisor/forecast/alerts layer that reads and interprets this data.
//
// Known gap, carried over unchanged from before this split (not introduced
// by it): the Marketing Intelligence section itself still renders
// hardcoded illustrative sample data, not real tracked leads — see the
// in-page banner in MarketingIntelligence.tsx. Reconciling that with the
// AI Assessment page's real QR/channel attribution data is separate,
// follow-up work, not part of this routing/IA reorg.
import dynamic from 'next/dynamic';
import IntelligenceShell, { SectionSkeleton, type IntelligenceNavItem } from '@/app/admin/intelligence/components/IntelligenceShell';

const SECTIONS: Record<string, React.ComponentType<{ data: any }>> = {
  marketing:  dynamic(() => import('@/app/admin/intelligence/components/MarketingIntelligence'), { loading: () => <SectionSkeleton /> }),
  seo:        dynamic(() => import('@/app/admin/intelligence/components/SEOIntelligence'), { loading: () => <SectionSkeleton /> }),
  geo:        dynamic(() => import('@/app/admin/intelligence/components/GEOIntelligence'), { loading: () => <SectionSkeleton /> }),
  competitor: dynamic(() => import('@/app/admin/intelligence/components/CompetitorIntelligence'), { loading: () => <SectionSkeleton /> }),
};

const NAV_ITEMS: IntelligenceNavItem[] = [
  { id: 'marketing',  label: 'Marketing Intelligence',  icon: '📱', group: 'Marketing' },
  { id: 'seo',        label: 'SEO Intelligence',        icon: '🔍', group: 'Marketing' },
  { id: 'geo',        label: 'GEO & AEO Intelligence',  icon: '🌐', group: 'Marketing' },
  { id: 'competitor', label: 'Competitor Intel',        icon: '🏆', group: 'Marketing' },
];

const GROUPS = ['Marketing'];

export default function MarketingIntelligencePage() {
  return (
    <IntelligenceShell
      eyebrow="Marketing Intelligence"
      title="Acquisition Dashboard"
      subtitle="Marketing Intelligence · What happened"
      groups={GROUPS}
      navItems={NAV_ITEMS}
      sections={SECTIONS}
      defaultActive="marketing"
    />
  );
}
