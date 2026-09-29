'use client';

import { motion } from 'framer-motion';
import { Gauge, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EASE } from '@/components/motion/reveal';
import { getPrivateCredentials } from '@/lib/midnight/credentials';
import { generateReputationProof, reputationIndex, REQUIREMENTS } from '@/lib/midnight/proofs';
import type { PrivateCredential, PrivateProof, RequirementId } from '@/lib/midnight/types';
import { logActivity } from '@/lib/requests';
import { useNova, useToastApi } from '@/lib/store';
import { cn, fingerprintShort } from '@/lib/utils';

const PREDICATES: Array<{ id: RequirementId; title: string; blurb: string }> = [
  { id: 'reputation_gt_750', title: 'Reputation > 750', blurb: 'Prove standing without revealing the score or its inputs.' },
  { id: 'projects_gte_3', title: 'At least 3 verified projects', blurb: 'Ship history without exposing your portfolio.' },
  { id: 'hackathons_gte_5', title: 'At least 5 hackathons', blurb: 'Community presence, zero profile disclosure.' },
];

export default function ReputationPage() {
  const vaultVersion = useNova((s) => s.vaultVersion);
  const bumpProofs = useNova((s) => s.bumpProofs);
  const toast = useToastApi();
  const [credentials, setCredentials] = useState<PrivateCredential[]>([]);
  const [busy, setBusy] = useState<RequirementId | null>(null);
  const [issued, setIssued] = useState<Record<string, PrivateProof>>({});

  useEffect(() => {
    void getPrivateCredentials().then(setCredentials).catch(() => setCredentials([]));
  }, [vaultVersion]);

  const score = reputationIndex(credentials);
  const projects = credentials.reduce((n, c) => n + (c.attributes.verifiedProjects ?? 0), 0);
  const hackathons = credentials.reduce((n, c) => n + (c.attributes.hackathons ?? 0), 0);

  const prove = async (id: RequirementId) => {
    setBusy(id);
    try {
      const proof = await generateReputationProof(id, credentials);
      setIssued((m) => ({ ...m, [id]: proof }));
      logActivity({
        kind: 'proof',
        label: `Reputation proof issued — ${REQUIREMENTS.find((r) => r.id === id)?.label}`,
        status: 'Verified',
      });
      bumpProofs();
      toast.success('Reputation proof sealed', 'Only the predicate result is verifiable.');
    } catch (e) {
      toast.error('Predicate not satisfied', e instanceof Error ? e.message : 'Not enough credentials yet.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader
        title="Private reputation"
        description="Your verifiable history, aggregated locally. Prove thresholds — the underlying profile never leaves the vault."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="surface relative overflow-hidden rounded-2xl p-7"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">Private aggregate</p>
            <Gauge className="size-4 text-nova-300" />
          </div>
          <p className="mt-6 text-[52px] font-semibold leading-none tracking-tight">
            {credentials.length === 0 ? '—' : `> ${Math.floor(score / 50) * 50}`}
          </p>
          <p className="mt-2 text-[13px] text-fog-500">reputation band · exact value sealed</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-ink-900/60 px-4 py-3">
              <p className="text-lg font-medium">{projects}</p>
              <p className="text-[12px] text-fog-600">verified projects</p>
            </div>
            <div className="rounded-lg border border-line bg-ink-900/60 px-4 py-3">
              <p className="text-lg font-medium">{hackathons}</p>
              <p className="text-[12px] text-fog-600">hackathons</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-16 size-48 rounded-full bg-nova-500/10 blur-3xl" />
        </motion.div>

        <div className="space-y-3">
          {PREDICATES.map((p, i) => {
            const proof = issued[p.id];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.08 + i * 0.06 }}
                className={cn('surface rounded-xl p-5', proof && 'border-ok/25')}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium">{p.title}</p>
                    <p className="mt-0.5 text-[13px] text-fog-500">{p.blurb}</p>
                  </div>
                  {proof ? (
                    <div className="flex items-center gap-2">
                      <Badge tone="verified">
                        <ShieldCheck className="size-3" /> sealed {fingerprintShort(proof.attestation)}
                      </Badge>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => prove(p.id)}>
                      {busy === p.id && <Loader2 className="size-3.5 animate-spin" />}
                      Generate proof
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
          <p className="px-1 text-[12px] leading-relaxed text-fog-600">
            Reputation proofs run the same circuit as eligibility proofs: predicates in, commitments
            out. A verifier learns the band — never the score, the projects, or the communities behind it.
          </p>
        </div>
      </div>
    </div>
  );
}
