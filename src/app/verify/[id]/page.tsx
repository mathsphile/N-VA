'use client';

import { Loader2 } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { VerifyResult } from '@/components/app/VerifyResult';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { getProofs, verifyProof } from '@/lib/midnight/proofs';
import type { VerificationResult } from '@/lib/midnight/types';
import { getRequest } from '@/lib/requests';
import { site } from '@/lib/site';
import Link from 'next/link';

function VerifyInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const proofId = searchParams.get('proof');
  const request = params.id ? getRequest(params.id) : undefined;
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!request) {
        if (!cancelled) setState('missing');
        return;
      }
      const proofs = await getProofs();
      const target = proofId ? proofs.find((p) => p.id === proofId) : proofs.find((p) => p.requestId === request.id);
      if (!target) {
        if (!cancelled) setState('missing');
        return;
      }
      const verified = await verifyProof(target.id, request);
      if (!cancelled) {
        setResult(verified);
        setState('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request, proofId]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-5 py-16">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-nova-300">
          <Logo size={22} />
          <span className="text-[15px] font-semibold tracking-[0.12em]">NØVA</span>
        </Link>
        <Badge tone="neutral">verifier view</Badge>
      </div>

      {state === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-20 text-fog-500">
          <Loader2 className="size-4 animate-spin" />
          Evaluating attestation…
        </div>
      )}

      {state === 'missing' && (
        <div className="surface rounded-2xl p-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-warn">No proof found</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {request ? `Nothing has been proven for “${request.name}” yet.` : 'Unknown verification request'}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fog-500">
            This view only ever renders claims and attestation status. If you are the applicant, open
            the request and generate a private proof first.
          </p>
          <Link href={request ? `/grant?request=${request.id}` : '/'} className="mt-6 inline-block">
            <Button variant="secondary">{request ? 'Generate the proof' : 'Back to NØVA'}</Button>
          </Link>
        </div>
      )}

      {state === 'ready' && result && <VerifyResult result={result} />}

      <p className="mt-10 text-center text-[12px] text-fog-700">
        {site.name} · {site.tagline} · underlying credentials were never transmitted
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-fog-500" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
