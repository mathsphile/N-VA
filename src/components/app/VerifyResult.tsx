'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EASE } from '@/components/motion/reveal';
import type { VerificationResult } from '@/lib/midnight/types';
import { cn, formatRelativeTime } from '@/lib/utils';

/**
 * What a verifier is allowed to see: claims + fingerprint. This
 * component takes VerificationResult, which contains no attributes —
 * the type system enforces the privacy boundary at the UI edge.
 */
export function VerifyResult({ result, showMeta = true }: { result: VerificationResult; showMeta?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={cn(
        'surface overflow-hidden rounded-2xl',
        result.verified ? 'border-ok/25' : 'border-bad/25',
      )}
    >
      <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5', result.verified ? 'border-ok/20 bg-ok/5' : 'border-bad/20 bg-bad/5')}>
        <div className="flex items-center gap-3">
          {result.verified ? (
            <CheckCircle2 className="size-6 text-ok" />
          ) : (
            <XCircle className="size-6 text-bad" />
          )}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-fog-500">NØVA verification</p>
            <p className={cn('text-lg font-semibold tracking-tight', result.verified ? 'text-ok' : 'text-bad')}>
              {result.verified ? 'VERIFIED ✓' : 'NOT VERIFIED'}
            </p>
          </div>
        </div>
        <Badge tone={result.source === 'midnight-ledger' ? 'verified' : 'accent'}>
          {result.source === 'midnight-ledger' ? 'verified on Midnight' : 'local proof engine'}
        </Badge>
      </div>

      <div className="px-6 py-5">
        <p className="text-[13px] font-medium text-fog-400">{result.organization} · {result.requestName}</p>
        <ul className="mt-4 space-y-2">
          {result.claims.map((claim, i) => (
            <motion.li
              key={claim.requirement}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.15 + i * 0.07 }}
              className="flex items-center justify-between rounded-lg border border-line bg-ink-900/60 px-4 py-3 font-mono text-[13px]"
            >
              <span className="text-fog-200">{claim.label}</span>
              {claim.satisfied ? <CheckCircle2 className="size-4 text-ok" /> : <XCircle className="size-4 text-bad" />}
            </motion.li>
          ))}
        </ul>
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-line bg-ink-950/60 p-4">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-nova-300" />
          <p className="text-[13px] leading-relaxed text-fog-500">
            Private information remains hidden. {result.claims.length} claim{result.claims.length === 1 ? '' : 's'} revealed —
            underlying credentials, attributes and history were never transmitted.
          </p>
        </div>
        {showMeta && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4 font-mono text-[11px] text-fog-600">
            <span>proof {result.proofId}</span>
            <span>·</span>
            <span>{formatRelativeTime(result.verifiedAt)}</span>
            <span>·</span>
            <span>mode {result.mode}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
