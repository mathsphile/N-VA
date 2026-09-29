'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, Loader2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ProofRunner } from '@/components/app/ProofRunner';
import { VerifyResult } from '@/components/app/VerifyResult';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EASE } from '@/components/motion/reveal';
import { alreadyAttested, getProofs, removeProofsFor, resetAttestation, verifyProof } from '@/lib/midnight/proofs';
import type { PrivateProof, VerificationResult } from '@/lib/midnight/types';
import { HACKSPIRE_GRANT_ID, getRequest } from '@/lib/requests';
import { cn } from '@/lib/utils';

type View = 'applicant' | 'verifier';

export default function DemoPage() {
  const request = getRequest(HACKSPIRE_GRANT_ID);
  const [view, setView] = useState<View>('applicant');
  const [proof, setProof] = useState<PrivateProof | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [runnerKey, setRunnerKey] = useState(0);

  const onProved = async (sealed: PrivateProof) => {
    setProof(sealed);
  };

  const switchToVerifier = async () => {
    if (!proof || !request) return;
    setChecking(true);
    try {
      const proofs = await getProofs();
      const stored = proofs.find((p) => p.id === proof.id) ?? proof;
      setResult(await verifyProof(stored.id, request));
      setView('verifier');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <Badge tone="accent">Guided demo</Badge>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.02em] sm:text-[2.8rem]">
          One student. One grant. Nothing revealed.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
          A university student applies for the HackSpire grant. Watch both sides of the same proof —
          applicant and verifier — and notice what the verifier never sees.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-center gap-2">
        {(['applicant', 'verifier'] as const).map((v) => (
          <button
            key={v}
            disabled={v === 'verifier' && !proof}
            onClick={() => (v === 'applicant' ? setView('applicant') : void switchToVerifier())}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors disabled:opacity-40',
              view === v ? 'border-nova-400/50 bg-nova-500/10 text-fog-100' : 'border-line text-fog-500 hover:text-fog-200',
            )}
          >
            {v === 'applicant' ? <UserRound className="size-3.5" /> : <Eye className="size-3.5" />}
            {checking && v === 'verifier' ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {v === 'applicant' ? 'Applicant view' : 'Verifier view'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'applicant' ? (
          <motion.div
            key="applicant"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mx-auto mt-10 max-w-2xl"
          >
            {request ? (
              <ProofRunner key={runnerKey} request={request} onComplete={onProved} />
            ) : (
              <p className="text-sm text-fog-500">Demo request unavailable.</p>
            )}
            {request && !proof && alreadyAttested(request.campaign) && (
              <div className="mt-6 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetAttestation(request.campaign);
                    removeProofsFor(request.id);
                    setRunnerKey((k) => k + 1);
                  }}
                >
                  Uniqueness already claimed for this scope — reset and replay
                </Button>
              </div>
            )}
            {proof && view === 'applicant' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
                <Button variant="secondary" onClick={switchToVerifier} disabled={checking}>
                  {checking ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  See what the verifier receives
                  <ArrowRight className="size-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="verifier"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mx-auto mt-10 max-w-2xl"
          >
            {result && <VerifyResult result={result} />}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="surface rounded-xl p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">Received</p>
                <ul className="mt-3 space-y-1.5 text-[13px] text-fog-300">
                  <li>✓ 4 boolean claims</li>
                  <li>✓ proof + attestation fingerprints</li>
                  <li>✓ verification timestamp</li>
                </ul>
              </div>
              <div className="rounded-xl border border-line bg-ink-950/60 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">Never revealed</p>
                <ul className="mt-3 space-y-1.5 text-[13px] text-fog-500 line-through decoration-fog-700">
                  <li>Name</li>
                  <li>Date of birth · Student ID</li>
                  <li>University · address · history</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setView('applicant')}>
                <ArrowLeft className="size-3.5" />
                Back to applicant
              </Button>
              <Link href="/grant">
                <Button size="sm" variant="secondary">
                  Run the live grant application
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
