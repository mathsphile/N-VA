import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-line text-fog-500 bg-ink-900',
        verified: 'border-ok/25 text-ok bg-ok/10',
        accent: 'border-nova-400/30 text-nova-200 bg-nova-500/10',
        pending: 'border-warn/25 text-warn bg-warn/10',
        danger: 'border-bad/30 text-bad bg-bad/10',
        mono: 'border-line font-mono text-fog-300 bg-ink-850',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
