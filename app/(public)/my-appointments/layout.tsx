import type { Metadata } from 'next';

// A personal lookup page: nothing here should appear in search results.
export const metadata: Metadata = {
  title: 'My Appointments',
  robots: { index: false, follow: false },
};

export default function MyAppointmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
