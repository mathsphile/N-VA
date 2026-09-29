'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, FileCheck2, Inbox, KeyRound, LayoutDashboard, Settings2 } from 'lucide-react';
import { Logo, Wordmark } from '@/components/ui/logo';
import { ModeBadge } from '@/components/site/ModeBadge';
import { WalletButton } from '@/components/site/Navbar';
import { cn } from '@/lib/utils';

const ICONS = {
  'layout-dashboard': LayoutDashboard,
  'key-round': KeyRound,
  'file-check-2': FileCheck2,
  'bar-chart-3': BarChart3,
  inbox: Inbox,
  activity: Activity,
  'settings-2': Settings2,
} as const;

export const DASH_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: ICONS['layout-dashboard'] },
  { href: '/dashboard/credentials', label: 'Credentials', icon: ICONS['key-round'] },
  { href: '/dashboard/proofs', label: 'Proofs', icon: ICONS['file-check-2'] },
  { href: '/dashboard/reputation', label: 'Reputation', icon: ICONS['bar-chart-3'] },
  { href: '/dashboard/requests', label: 'Requests', icon: ICONS.inbox },
  { href: '/dashboard/activity', label: 'Activity', icon: ICONS.activity },
  { href: '/dashboard/settings', label: 'Settings', icon: ICONS['settings-2'] },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1500px] pt-16">
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-2 text-nova-300">
          <Logo size={20} />
          <Wordmark className="text-[13px]" />
        </Link>
        <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
          {DASH_LINKS.map((item) => {
            const active =
              item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
                  active
                    ? 'bg-nova-500/10 font-medium text-fog-100 shadow-[inset_0_0_0_1px_rgba(139,134,250,0.18)]'
                    : 'text-fog-500 hover:bg-ink-850 hover:text-fog-200',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-2">
          <ModeBadge />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex gap-1 overflow-x-auto border-b border-line px-4 py-2.5 lg:hidden">
          {DASH_LINKS.map((item) => {
            const active =
              item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                  active ? 'border-nova-400/40 bg-nova-500/10 text-fog-100' : 'border-line text-fog-500',
                )}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">
            NØVA · private proof network
          </p>
          <WalletButton />
        </header>
        <div className="px-5 py-8 sm:px-8 sm:py-10">{children}</div>
      </div>
    </div>
  );
}
