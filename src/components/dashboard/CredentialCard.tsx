'use client';

import { motion } from 'framer-motion';
import { BadgeCheck, Clock, EyeOff, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LockedAttributes } from '@/components/dashboard/parts';
import { EASE } from '@/components/motion/reveal';
import type { PrivateCredential } from '@/lib/midnight/types';
import { cn, formatDate } from '@/lib/utils';

const STATUS = {
  verified: { label: 'VERIFIED ✓', tone: 'verified' as const, icon: BadgeCheck },
  pending: { label: 'PENDING', tone: 'pending' as const, icon: Clock },
  revoked: { label: 'REVOKED', tone: 'danger' as const, icon: ShieldX },
};

export function CredentialCard({
  credential,
  onRequestProof,
  index = 0,
}: {
  credential: PrivateCredential;
  onRequestProof?: (credential: PrivateCredential) => void;
  index?: number;
}) {
  const status = STATUS[credential.status];
  const StatusIcon = status.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      className="surface group relative overflow-hidden rounded-2xl p-5"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-fog-600">
          ◈ {credential.status === 'verified' ? 'verified credential' : 'credential'}
        </span>
        <StatusIcon
          className={cn(
            'size-4 transition-opacity',
            status.tone === 'verified' ? 'text-ok' : status.tone === 'pending' ? 'text-warn' : 'text-bad',
          )}
        />
      </div>

      <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{credential.label}</h3>
      <p className="mt-0.5 text-[13px] text-fog-500">
        Issued by <span className="text-fog-300">{credential.issuer}</span>
      </p>

      <LockedAttributes className="mt-4" />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-fog-600">
          <EyeOff className="size-3.5" />
          sealed · {formatDate(credential.issuedAt)}
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={credential.status !== 'verified' || !onRequestProof}
          onClick={() => onRequestProof?.(credential)}
        >
          Generate proof
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-nova-400/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-fog-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        commitment {credential.commitment.slice(0, 10)}…
      </p>
    </motion.article>
  );
}
