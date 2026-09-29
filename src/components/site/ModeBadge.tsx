'use client';

import { Badge } from '@/components/ui/badge';
import { midnightConfig } from '@/lib/midnight/network';

/**
 * Honesty-first environment badge: the UI always states whether proofs
 * are being bound to a Midnight ledger or executed by the local engine.
 */
export function ModeBadge({ className }: { className?: string }) {
  const cfg = midnightConfig();
  if (cfg.mode === 'ledger') {
    return (
      <Badge tone="verified" className={className}>
        <span className="size-1.5 rounded-full bg-ok" aria-hidden />
        Midnight · {cfg.networkId}
      </Badge>
    );
  }
  return (
    <Badge tone="accent" className={className}>
      <span className="size-1.5 rounded-full bg-nova-400" aria-hidden />
      Local proof engine
    </Badge>
  );
}
