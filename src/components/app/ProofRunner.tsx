'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  Lock,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EASE } from '@/components/motion/reveal';
import { ModeBadge } from '@/components/site/ModeBadge';
import { getPrivateCredentials, seedDemoVault } from '@/lib/midnight/credentials';
import { ProofRejectionError, generateProof, requirementById } from '@/lib/midnight/proofs';
import type { PrivateProof, ProofRequest } from '@/lib/midnight/types';
import { logActivity } from '@/lib/requests';
import { useNova, useToastApi } from '@/lib/store';
import { cn, fingerprintShort } from '@/lib/utils';

type Phase = 'idle' | 'preparing' | 'generating' | 'generated' | 'submitting' | 'verified' | 'error';

const STEPS = [
  { label: 'Unlock private vault', icon: Lock },
  { label: 'Evaluate credential circuit', icon: ScanLine },
  { label: 'Bind attestation fingerprint', icon: ShieldCheck },
];

/**
 * ProofRunner — the canonical generate→verify interaction, reused by
 * the landing demo, /demo and /grant so the core flow is written once.
 */
export function ProofRunner({
  request,
  autoSeed = true,
  onComplete,
  compact = false,
}: {
  request: ProofRequest;
  autoSeed?: boolean;
  onComplete?: (proof: PrivateProof) => void;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [proof, setProof] = useState<PrivateProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bumpProofs = useNova((s) => s.bumpProofs);
  const toast = useToastApi();

  const generate = async () => {
    setPhase('preparing');
    setError(null);
    setStep(0);
    try {
      if (autoSeed) await seedDemoVault();
      const credentials = await getPrivateCredentials();
      if (credentials.length === 0) {
        throw new ProofRejectionError('Your vault is empty. Request credentials first from the dashboard.');
      }
      setPhase('generating');
      for (let i = 0; i < STEPS.length; i += 1) {
        await new Promise((r) => setTimeout(r, 480));
        setStep(i + 1);
      }
      const sealed = await generateProof(request, credentials);
      setProof(sealed);
      setPhase('generated');
      logActivity({
        kind: 'proof',
        label: `${request.name} — private proof generated`,
        status: sealed.claims.filter((c) => c.satisfied).length === sealed.claims.length ? 'Satisfied' : 'Partial',
      });
      bumpProofs();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Proof generation failed.';
      setError(message);
      setPhase('error');
      toast.error('Proof not generated', message);
    }
  };

  const submit = async () => {
    setPhase('submitting');
    await new Promise((r) => setTimeout(r, 700));
    setPhase('verified');
    logActivity({ kind: 'verification', label: `${request.name} proof submitted`, status: 'Verified' });
    toast.success('Proof submitted', 'Verified by the local NØVA engine — claims only, no attributes.');
    if (proof) onComplete?.(proof);
  };

  const satisfiedCount = proof?.claims.filter((c) => c.satisfied).length ?? 0;

  return (
    <div className={cn('surface overflow-hidden rounded-2xl', compact ? 'p-5' : 'p-6 sm:p-8')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">
            NØVA proof request
          </p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{request.name}</h3>
          <p className="mt-0.5 text-[13px] text-fog-500">{request.organization}</p>
        </div>
        <ModeBadge />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {request.requirements.map((id, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-ink-900/60 px-3.5 py-3 text-sm"
          >
            <Check className="size-3.5 text-nova-300" />
            <span className="text-fog-200">{requirementById(id).label}</span>
          </motion.div>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-fog-500">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-fog-600" />
        Your private information will <span className="text-fog-200">not</span> be revealed. Only these
        claims and a circuit attestation leave your device.
      </p>

      <AnimatePresence mode="wait">
        {phase === 'idle' || phase === 'error' ? (
          <motion.div key="cta" exit={{ opacity: 0, height: 0 }} className="mt-6">
            {phase === 'error' && error && (
              <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-lg border border-bad/25 bg-bad/5 p-3.5 text-[13px] text-bad">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button size="lg" className="w-full sm:w-auto" onClick={generate}>
              <Sparkles className="size-4" />
              Generate private proof
            </Button>
            <p className="mt-2.5 text-[12px] text-fog-600">Estimated verification time · &lt; 10 seconds</p>
          </motion.div>
        ) : phase === 'preparing' || phase === 'generating' ? (
          <motion.ol
            key="steps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-3"
            aria-live="polite"
          >
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const state = step > i ? 'done' : step === i ? 'active' : 'pending';
              return (
                <li key={s.label} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg border transition-all duration-300',
                      state === 'done' && 'border-ok/40 bg-ok/10 text-ok',
                      state === 'active' && 'border-nova-400/50 bg-nova-500/10 text-nova-200',
                      state === 'pending' && 'border-line text-fog-700',
                    )}
                  >
                    {state === 'done' ? <Check className="size-4" /> : state === 'active' ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                  </span>
                  <span className={cn(state === 'pending' ? 'text-fog-600' : 'text-fog-200')}>{s.label}</span>
                </li>
              );
            })}
          </motion.ol>
        ) : phase === 'generated' || phase === 'submitting' ? (
          <motion.div
            key="generated"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="mt-6 rounded-xl border border-nova-400/30 bg-nova-500/5 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-nova-200">
                Proof generated
              </p>
              <Badge tone="mono">{fingerprintShort(proof?.attestation ?? '')}</Badge>
            </div>
            <ul className="mt-4 space-y-2 text-[13px]">
              <li className="flex items-center gap-2 text-fog-200"><Check className="size-3.5 text-ok" /> Requirements satisfied ({satisfiedCount}/{request.requirements.length})</li>
              <li className="flex items-center gap-2 text-fog-200"><Check className="size-3.5 text-ok" /> Private data protected — 0 attributes revealed</li>
              <li className="flex items-center gap-2 text-fog-200"><Check className="size-3.5 text-ok" /> Attested by {proof?.attestedBy}</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={submit} disabled={phase === 'submitting'}>
                {phase === 'submitting' ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                {phase === 'submitting' ? 'Submitting proof…' : 'Submit proof'}
              </Button>
              {request.mode === 'simulation' && (
                <p className="self-center text-[12px] text-fog-600">
                  Local engine attestation — bind to a Midnight ledger for on-chain attestation.
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="verify-pulse mt-6 rounded-xl border border-ok/30 bg-ok/5 p-6 text-center"
          >
            <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-ok/40 bg-ok/10">
              <ShieldCheck className="size-6 text-ok" />
            </span>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-ok">Verified</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {satisfiedCount} / {request.requirements.length} requirements satisfied
            </p>
            <p className="mt-1 text-sm text-fog-500">0 personal attributes revealed.</p>
            {proof && (
              <p className="mt-4 inline-block rounded-md border border-line bg-ink-900 px-3 py-1.5 font-mono text-[12px] text-fog-400">
                proof {proof.id} · attestation {fingerprintShort(proof.attestation)}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
