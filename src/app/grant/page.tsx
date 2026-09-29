'use client';

import { BadgeCheck, Loader2, Lock, Wallet } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ProofRunner } from '@/components/app/ProofRunner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModeBadge } from '@/components/site/ModeBadge';
import { REQUIREMENTS } from '@/lib/midnight/proofs';
import { HACKSPIRE_GRANT_ID, getRequest } from '@/lib/requests';
import { useNova } from '@/lib/store';

function GrantInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('request') ?? HACKSPIRE_GRANT_ID;
  const request = getRequest(id);
  const wallet = useNova((s) => s.wallet);
  const openWallet = useNova((s) => s.setWalletModalOpen);

  if (!request) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-warn">Unknown request</p>
        <h1 className="mt-3 text-2xl font-semibold">This verification doesn&apos;t exist (or was deleted locally).</h1>
        <p className="mt-3 text-sm text-fog-500">
          Requests live on the applicant&apos;s device via the share link — open the original link from the organization.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">Private application</Badge>
        <ModeBadge />
      </div>

      <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.02em] sm:text-[2.6rem]">
        {request.name}
      </h1>
      <p className="mt-2 text-[15px] text-fog-500">{request.organization}</p>
      {request.description && (
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-fog-400">{request.description}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="surface rounded-xl p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">Requirements</p>
          <ul className="mt-4 space-y-2.5">
            {request.requirements.map((r) => (
              <li key={r} className="flex items-center gap-2.5 text-sm text-fog-200">
                <BadgeCheck className="size-4 text-nova-300" />
                {REQUIREMENTS.find((x) => x.id === r)?.label ?? r.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <div className="surface rounded-xl p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">Verification</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{'<'} 10s</p>
            <p className="mt-1 text-[13px] text-fog-500">estimated proof time</p>
          </div>
          <div className="rounded-xl border border-line bg-ink-950/60 p-5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-fog-300">
              <Lock className="size-3.5 text-nova-300" /> No personal data
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fog-500">
              Name, ID, university and history stay in your encrypted vault. This form collects nothing.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {wallet ? (
          <Badge tone="verified">
            <span className="size-1.5 rounded-full bg-ok" aria-hidden />
            {wallet.providerName} connected
          </Badge>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => openWallet(true)}>
            <Wallet className="size-4" />
            Connect wallet (recommended)
          </Button>
        )}
        {!wallet && (
          <p className="text-[12px] text-fog-600">
            You can continue on the local engine — browser proofs verify locally; ledger attestation runs through the Compact tooling.
          </p>
        )}
      </div>

      <div className="mt-8">
        <ProofRunner key={request.id + (wallet ? 'w' : 'n')} request={request} />
      </div>
    </div>
  );
}

export default function GrantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-fog-500" />
        </div>
      }
    >
      <GrantInner />
    </Suspense>
  );
}
