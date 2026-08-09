'use client';

// The insight/recommendation layer — reads Business Intelligence
// (/admin/business-intelligence) and Marketing Intelligence
// (/admin/marketing-intelligence) and answers "why did it happen?" and
// "what should we do next?" Split out of the old single "AI Intelligence"
// page (architecture review, Aug 2026), which had 14 sections under this
// label — 10 of them were facts (moved to the two pages above). Only
// AI Business Advisor is a genuine LLM-generated feature today.
//
// Known gaps, carried over unchanged from before this split (not
// introduced by it, flagged for separate follow-up):
// - Forecast is labeled "AI-powered" but its scenario math runs client-side
//   off a server-computed trend line — no LLM call in this path.
// - Growth Opportunities is a static list of generic clinic-marketing
//   tactics (see the file's own comment: "universal hardcoded growth plays
//   that apply to any aesthetic clinic"), not computed from this clinic's
//   actual data.
import dynamic from 'next/dynamic';
import IntelligenceShell, { SectionSkeleton, type IntelligenceNavItem } from '@/app/admin/intelligence/components/IntelligenceShell';

const SECTIONS: Record<string, React.ComponentType<{ data: any }>> = {
  ai:      dynamic(() => import('@/app/admin/intelligence/components/AIAdvisor'), { loading: () => <SectionSkeleton /> }),
  forecast: dynamic(() => import('@/app/admin/intelligence/components/Forecast'), { loading: () => <SectionSkeleton /> }),
  growth:  dynamic(() => import('@/app/admin/intelligence/components/GrowthOpportunities'), { loading: () => <SectionSkeleton /> }),
  alerts:  dynamic(() => import('@/app/admin/intelligence/components/AlertsCenter'), { loading: () => <SectionSkeleton /> }),
};

const NAV_ITEMS: IntelligenceNavItem[] = [
  { id: 'ai',       label: 'AI Business Advisor',  icon: '🤖', group: 'Advisor' },
  { id: 'forecast', label: 'Forecast',             icon: '📈', group: 'Advisor' },
  { id: 'growth',   label: 'Growth Opportunities', icon: '🌱', group: 'Advisor' },
  { id: 'alerts',   label: 'Alerts Center',        icon: '🚨', group: 'Advisor' },
];

const GROUPS = ['Advisor'];

export default function AiIntelligencePage() {
  return (
    <IntelligenceShell
      eyebrow="AI Intelligence"
      title="Insight & Advisor Dashboard"
      subtitle="AI Intelligence · Why, and what's next"
      groups={GROUPS}
      navItems={NAV_ITEMS}
      sections={SECTIONS}
      defaultActive="ai"
      showAlertBadge
    />
  );
}
