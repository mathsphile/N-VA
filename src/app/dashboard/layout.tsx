import { DashboardShell } from '@/components/dashboard/Shell';

export const metadata = {
  title: 'Dashboard',
  description: 'Your private credentials, proofs and verification requests.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
