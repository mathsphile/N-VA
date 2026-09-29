'use client';

import { KeyRound, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CredentialCard } from '@/components/dashboard/CredentialCard';
import { EmptyState, PageHeader } from '@/components/dashboard/parts';
import { ProofRequestDialog } from '@/components/dashboard/ProofRequestDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonCard } from '@/components/ui/skeleton';
import { getPrivateCredentials, issueCredential } from '@/lib/midnight/credentials';
import { midnightConfig } from '@/lib/midnight/network';
import type { CredentialKind, PrivateCredential, ProofRequest } from '@/lib/midnight/types';
import { logActivity } from '@/lib/requests';
import { useNova, useToastApi } from '@/lib/store';

const KIND_REQUIREMENT: Record<CredentialKind, { req: ProofRequest['requirements'][number]; label: string }> = {
  student: { req: 'student', label: 'Student' },
  age: { req: 'age_18', label: 'Age > 18' },
  region: { req: 'region_eligible', label: 'Eligible country' },
  developer: { req: 'developer', label: 'Developer' },
  hackathon: { req: 'hackathon_participant', label: 'Hackathon participation' },
  university: { req: 'student', label: 'University enrollment' },
  employment: { req: 'employment_verified', label: 'Employment' },
  grant: { req: 'grant_eligible', label: 'Grant eligibility' },
};

function requestForCredential(credential: PrivateCredential): ProofRequest {
  const { req, label } = KIND_REQUIREMENT[credential.kind];
  return {
    id: `self_${credential.id}`,
    name: `Private ${label} attestation`,
    organization: 'Self-issued',
    description: 'Single-claim proof derived from one credential.',
    requirements: [req],
    campaign: `self:${credential.id}:${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'open',
    mode: midnightConfig().mode,
  };
}

export default function CredentialsPage() {
  const vaultVersion = useNova((s) => s.vaultVersion);
  const bumpVault = useNova((s) => s.bumpVault);
  const toast = useToastApi();
  const [credentials, setCredentials] = useState<PrivateCredential[] | null>(null);
  const [active, setActive] = useState<ProofRequest | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ label: '', issuer: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCredentials(await getPrivateCredentials());
    } catch (e) {
      toast.error('Vault could not be opened', e instanceof Error ? e.message : 'Reset the vault from Settings.');
      setCredentials([]);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh, vaultVersion]);

  const addCredential = async () => {
    if (form.label.trim().length < 3) {
      setFormError('Give the credential a descriptive name (min 3 characters).');
      return;
    }
    if (form.issuer.trim().length < 2) {
      setFormError('The issuing organization is required.');
      return;
    }
    await issueCredential({
      kind: 'grant',
      label: form.label.trim(),
      issuer: form.issuer.trim(),
      attributes: { grantReceived: false, note: 'custom' },
    });
    logActivity({ kind: 'issuance', label: `${form.label.trim()} credential issued`, status: 'Issued' });
    toast.success('Credential sealed into vault', 'Attributes are encrypted on this device.');
    bumpVault();
    void refresh();
    setAddOpen(false);
    setForm({ label: '', issuer: '' });
    setFormError(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <PageHeader
        title="Credentials"
        description="Sealed objects in your vault. Each card shows what a verifier may learn — never the data beneath it."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add credential
          </Button>
        }
      />

      {credentials === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : credentials.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No credentials yet"
          description="Credentials are issued by universities, communities and organizations. Add one, or generate a proof to pull in a demo vault."
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              Add your first credential
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {credentials.map((c, i) => (
            <CredentialCard key={c.id} credential={c} index={i} onRequestProof={(cred) => setActive(requestForCredential(cred))} />
          ))}
        </div>
      )}

      <ProofRequestDialog request={active} open={active !== null} onOpenChange={(o) => !o && setActive(null)} />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add credential</DialogTitle>
            <DialogDescription>
              In ledger mode this would bind an issuer&apos;s attestation on Midnight. Locally it seals the
              attributes into your encrypted vault.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cred-label">Credential</Label>
              <Input
                id="cred-label"
                className="mt-1.5"
                placeholder="e.g. Research Fellowship Holder"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="cred-issuer">Issued by</Label>
              <Input
                id="cred-issuer"
                className="mt-1.5"
                placeholder="e.g. FIEM, Midnight Dev Guild"
                value={form.issuer}
                onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
              />
            </div>
            {formError && <p role="alert" className="text-[13px] text-bad">{formError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={addCredential}>
                Seal credential
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
