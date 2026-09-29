'use client';

import { motion } from 'framer-motion';
import { Activity as ActivityIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EASE } from '@/components/motion/reveal';
import type { ActivityItem } from '@/lib/midnight/types';
import { formatRelativeTime } from '@/lib/utils';

const TONE: Record<string, 'verified' | 'accent' | 'pending' | 'neutral'> = {
  Verified: 'verified',
  Issued: 'accent',
  Generated: 'accent',
  Pending: 'pending',
  Revoked: 'neutral',
};

export function ActivityList({ items, dense = false }: { items: ActivityItem[]; dense?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="surface flex flex-col items-center rounded-xl px-6 py-10 text-center">
        <ActivityIcon className="size-5 text-fog-600" />
        <p className="mt-3 text-[13px] text-fog-500">No activity yet. Generate your first private proof.</p>
      </div>
    );
  }
  return (
    <ul className={dense ? 'space-y-2' : 'surface divide-y divide-line rounded-xl'}>
      {items.map((item, i) => (
        <motion.li
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: Math.min(i * 0.04, 0.4) }}
          className={
            dense
              ? 'flex items-center gap-3 rounded-lg border border-line bg-ink-900/50 px-4 py-3'
              : 'flex items-center gap-3 px-4 py-3.5'
          }
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-fog-200">{item.label}</p>
            <p className="mt-0.5 font-mono text-[11px] text-fog-600">{formatRelativeTime(item.at)}</p>
          </div>
          <Badge tone={TONE[item.status] ?? 'neutral'}>{item.status}</Badge>
        </motion.li>
      ))}
    </ul>
  );
}
