'use client';

// Facts about clinic operations — revenue, treatments, patients, doctors,
// branches. Answers "what happened?" Split out of the old single "AI
// Intelligence" page (architecture review, Aug 2026): these six sections
// were never AI-generated, they're deterministic Business Intelligence —
// see AI Intelligence (/admin/ai-intelligence) for the advisor/forecast/
// alerts layer that actually reads and interprets this data.
import dynamic from 'next/dynamic';
import IntelligenceShell, { SectionSkeleton, type IntelligenceNavItem } from '@/app/admin/intelligence/components/IntelligenceShell';

const SECTIONS: Record<string, React.ComponentType<{ data: any }>> = {
  overview:  dynamic(() => import('@/app/admin/intelligence/components/ExecutiveOverview'), { loading: () => <SectionSkeleton /> }),
  revenue:   dynamic(() => import('@/app/admin/intelligence/components/RevenueIntelligence'), { loading: () => <SectionSkeleton /> }),
  treatment: dynamic(() => import('@/app/admin/intelligence/components/TreatmentIntelligence'), { loading: () => <SectionSkeleton /> }),
  patient:   dynamic(() => import('@/app/admin/intelligence/components/PatientIntelligence'), { loading: () => <SectionSkeleton /> }),
  doctor:    dynamic(() => import('@/app/admin/intelligence/components/DoctorPerformance'), { loading: () => <SectionSkeleton /> }),
  clinic:    dynamic(() => import('@/app/admin/intelligence/components/ClinicPerformance'), { loading: () => <SectionSkeleton /> }),
};

const NAV_ITEMS: IntelligenceNavItem[] = [
  { id: 'overview',   label: 'Executive Overview',     icon: '📊', group: 'Overview' },
  { id: 'revenue',    label: 'Revenue Intelligence',   icon: '💰', group: 'Analytics' },
  { id: 'treatment',  label: 'Treatment Intelligence', icon: '💊', group: 'Analytics' },
  { id: 'patient',    label: 'Patient Intelligence',   icon: '👥', group: 'Analytics' },
  { id: 'doctor',     label: 'Doctor Performance',     icon: '👨‍⚕️', group: 'Operations' },
  { id: 'clinic',     label: 'Clinic Performance',     icon: '🏥', group: 'Operations' },
];

const GROUPS = ['Overview', 'Analytics', 'Operations'];

export default function BusinessIntelligencePage() {
  return (
    <IntelligenceShell
      eyebrow="Business Intelligence"
      title="Operations Dashboard"
      subtitle="Business Intelligence · What happened"
      groups={GROUPS}
      navItems={NAV_ITEMS}
      sections={SECTIONS}
      defaultActive="overview"
    />
  );
}
