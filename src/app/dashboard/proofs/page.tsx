'use client';

import { ExternalLink, FileCheck2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, PageHeader } from '@/components/dashboard/parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { EASE } from '@/components/motion/reveal';
import { getProofs } from '@/lib/midnight/proofs';
import type { PrivateProof } from '@/lib/midnight/types';
import { getRequest } from '@/lib/requests';
import { useNova } from '@/lib/store';
import { cn, fingerprintShort, formatRelativeTime } from '@/lib/utils';

export default function ProofsPage() {
  const proofsVersion = useNova((s) => s.proofsVersion);
  const [proofs, setProofs] = useState<PrivateProof[] | null>(null);

  const refresh = useCallback(async () => {
    setProofs(await getProofs());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, proofsVersion]);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader
        title="Proofs"
        description="Every proof you generated. Each row is a record of what was revealed — claims and a fingerprint — and nothing more."
      />

      {proofs === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : proofs.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No proofs yet"
          description="Open a verification request from Overview and generate your first private proof."
          action={
            <Link href="/dashboard">
              <Button size="sm">Browse requests</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {proofs.map((proof, i) => {
            const request = getRequest(proof.requestId);
            const allOk = proof.claims.every((c) => c.satisfied);
            return (
              <motion.li
                key={proof.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.05, 0.4) }}
                className="surface flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl px-5 py-4"
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    allOk ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn',
                  )}
                >
                  <FileCheck2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{request?.name ?? 'Self-issued proof'}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-fog-600">
                    {proof.id} · {fingerprintShort(proof.attestation)} · {formatRelativeTime(proof.generatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {proof.claims.map((c) => (
                    <span
                      key={c.requirement}
                      title={c.label}
                      className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono', c.satisfied ? 'border-ok/25 text-ok' : 'border-bad/30 text-bad')}
                    >
                      {c.satisfied ? '✓' : '✕'}
                    </span>
                  ))}
                  <Badge tone={proof.mode === 'ledger' ? 'verified' : 'accent'}>
                    {proof.mode === 'ledger' ? 'midnight' : 'local engine'}
                  </Badge>
                  <Link href={`/verify/${proof.requestId}?proof=${proof.id}`}>
                    <Button size="sm" variant="ghost" aria-label="View verifier's result for this proof">
                      <ExternalLink className="size-3.5" />
                      View as verifier
                    </Button>
                  </Link>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
