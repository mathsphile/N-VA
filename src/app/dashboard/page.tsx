'use client';

import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader, EmptyState, StatCard } from '@/components/dashboard/parts';
import { CredentialCard } from '@/components/dashboard/CredentialCard';
import { ProofRequestDialog } from '@/components/dashboard/ProofRequestDialog';
import { ActivityList } from '@/components/dashboard/ActivityList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { getPrivateCredentials, seedDemoVault } from '@/lib/midnight/credentials';
import { REQUIREMENTS, reputationIndex } from '@/lib/midnight/proofs';
import type { PrivateCredential, ProofRequest } from '@/lib/midnight/types';
import { listActivity, listRequests, logActivity } from '@/lib/requests';
import { useNova } from '@/lib/store';

export default function OverviewPage() {
  const vaultVersion = useNova((s) => s.vaultVersion);
  const proofsVersion = useNova((s) => s.proofsVersion);
  const [credentials, setCredentials] = useState<PrivateCredential[] | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [proofCount, setProofCount] = useState(0);
  const [active, setActive] = useState<ProofRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const creds = await getPrivateCredentials();
        const proofs = await import('@/lib/midnight/proofs').then((m) => m.getProofs());
        if (cancelled) return;
        setCredentials(creds);
        setProofCount(proofs.length);
        setVaultError(null);
      } catch (e) {
        if (!cancelled) setVaultError(e instanceof Error ? e.message : 'Vault could not be decrypted.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultVersion, proofsVersion]);

  const requests = useMemo(() => listRequests().filter((r) => r.status === 'open'), []);
  const activity = useMemo(() => listActivity().slice(0, 6), []);
  const reputation = credentials ? reputationIndex(credentials) : 0;
  const orgCount = new Set(requests.map((r) => r.organization)).size;

  const loadVault = async () => {
    const creds = await seedDemoVault();
    logActivity({ kind: 'issuance', label: 'Demo credentials issued to vault', status: 'Issued' });
    useNova.getState().bumpVault();
    setCredentials(creds);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <PageHeader
        title="Overview"
        description="Everything here is computed from your local vault. NØVA holds no user database — there is nothing to breach."
        actions={
          <>
            <Link href="/demo">
              <Button variant="secondary" size="sm">
                <Play className="size-3.5" /> Launch demo
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Private credentials" value={credentials?.length ?? 0} hint="encrypted on this device" />
        <StatCard label="Proofs generated" value={proofCount} hint="selective disclosures" delay={0.05} />
        <StatCard label="Verifying organizations" value={orgCount} hint="open request sets" delay={0.1} />
        <StatCard label="Reputation" value={credentials && credentials.length > 0 ? `> ${Math.floor(reputation / 50) * 50}` : '—'} hint="private aggregate" delay={0.15} />
      </div>

      <section aria-labelledby="open-requests">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="open-requests" className="text-lg font-semibold tracking-tight">
            Verification requests
          </h2>
          <Link href="/dashboard/requests" className="text-[13px] text-nova-300 hover:underline">
            Manage requests
          </Link>
        </div>
        {requests.length === 0 ? (
          <EmptyState
            title="No open requests"
            description="Organizations you share your public proof endpoint with can post eligibility requirements here."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {requests.slice(0, 4).map((r) => (
              <div key={r.id} className="surface rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-medium">{r.name}</p>
                    <p className="mt-0.5 text-[13px] text-fog-500">wants to verify:</p>
                  </div>
                  <Badge tone={r.status === 'open' ? 'accent' : 'neutral'}>{r.status}</Badge>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {r.requirements.map((id) => (
                    <li key={id} className="flex items-center gap-2 text-[13px] text-fog-300">
                      <span className="text-ok">✓</span> {REQUIREMENTS.find((x) => x.id === id)?.label ?? id}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] text-fog-600">Nothing else will be shared.</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => setActive(r)}>
                    Review &amp; prove
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="recent-credentials">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="recent-credentials" className="text-lg font-semibold tracking-tight">
              Vault preview
            </h2>
            <Link href="/dashboard/credentials" className="text-[13px] text-nova-300 hover:underline">
              All credentials
            </Link>
          </div>
          {credentials === null ? (
            vaultError !== null ? (
              <EmptyState
                icon={CredentialIcon}
                title="Vault could not be opened"
                description={`${vaultError} You can reset the local vault from Settings.`}
                action={
                  <Link href="/dashboard/settings">
                    <Button size="sm">Open settings</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )
          ) : credentials.length === 0 ? (
            <EmptyState
              icon={CredentialIcon}
              title="Your vault is empty"
              description="Request a starter set of verified credentials to explore NØVA, or add credentials one by one."
              action={
                <Button size="sm" onClick={loadVault}>
                  Request demo credentials
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {credentials.slice(0, 2).map((c, i) => (
                <CredentialCard key={c.id} credential={c} index={i} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="recent-activity">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="recent-activity" className="text-lg font-semibold tracking-tight">
              Recent activity
            </h2>
            <Link href="/dashboard/activity" className="text-[13px] text-nova-300 hover:underline">
              Full log
            </Link>
          </div>
          <ActivityList items={activity} />
        </section>
      </div>

      <ProofRequestDialog request={active} open={active !== null} onOpenChange={(o) => !o && setActive(null)} />
    </div>
  );
}

function CredentialIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 2.2 20.4 7v10L12 21.8 3.6 17V7L12 2.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
