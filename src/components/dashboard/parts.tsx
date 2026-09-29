'use client';

import { motion } from 'framer-motion';
import { Inbox, KeyRound } from 'lucide-react';
import * as React from 'react';
import { CountUp } from '@/components/ui/count-up';
import { Logo } from '@/components/ui/logo';
import { EASE } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{title}</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fog-500">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  hint,
  delay = 0,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      className="surface group relative overflow-hidden rounded-xl p-5"
    >
      <p className="text-[12px] text-fog-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-tight">
        {typeof value === 'number' ? <CountUp value={value} /> : value}
        {suffix && <span className="ml-1 text-base font-medium text-fog-500">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-[12px] text-fog-600">{hint}</p>}
      <div className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-nova-500/0 blur-2xl transition-colors duration-500 group-hover:bg-nova-500/10" />
    </motion.div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center rounded-2xl px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-line bg-ink-900 text-fog-500">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-[15px] font-medium">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-fog-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LockedAttributes({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-1', className)} aria-label="Attributes encrypted">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <KeyRound className="size-3 text-fog-700" />
          <p className="font-mono text-[11px] tracking-wider text-fog-700">
            {'▓▒░'.repeat(8)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BrandDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-10">
      <span className="h-px flex-1 max-w-24 bg-line" />
      <Logo size={16} className="text-fog-700" />
      <span className="h-px flex-1 max-w-24 bg-line" />
    </div>
  );
}
