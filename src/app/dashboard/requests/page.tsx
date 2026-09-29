'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Inbox, Loader2, Plus, Send, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, PageHeader } from '@/components/dashboard/parts';
import { PolicyComposer } from '@/components/dashboard/PolicyComposer';
import { VerifyResult } from '@/components/app/VerifyResult';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EASE } from '@/components/motion/reveal';
import { midnightConfig } from '@/lib/midnight/network';
import { getProofs, REQUIREMENTS, verifyProof } from '@/lib/midnight/proofs';
import type { ProofRequest, RequirementId, VerificationResult } from '@/lib/midnight/types';
import { createRequest, fulfillRequest, listRequests } from '@/lib/requests';
import { useNova, useToastApi } from '@/lib/store';
import { cn, formatRelativeTime } from '@/lib/utils';

export default function RequestsPage() {
  const proofsVersion = useNova((s) => s.proofsVersion);
  const vaultVersion = useNova((s) => s.vaultVersion);
  const toast = useToastApi();
  const [requests, setRequests] = useState<ProofRequest[]>([]);
  const [selected, setSelected] = useState<ProofRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', description: '' });
  const [requirements, setRequirements] = useState<RequirementId[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [resultBusy, setResultBusy] = useState(false);

  const refresh = useCallback(() => {
    setRequests(listRequests());
  }, []);

  useEffect(refresh, [refresh, proofsVersion, vaultVersion]);

  const shareUrl = (id: string) =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/grant?request=${id}`;

  const toggle = (id: RequirementId) =>
    setRequirements((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const submit = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const request = await createRequest({ ...form, requirements });
      setForm({ name: '', organization: '', description: '' });
      setRequirements([]);
      setCreating(false);
      setSelected(request);
      toast.success('Verification created', 'Share the request link with applicants.');
      refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not create request.');
    } finally {
      setSubmitting(false);
    }
  };

  const viewResult = async (request: ProofRequest) => {
    setResultBusy(true);
    setSelected(request);
    try {
      const proofs = await getProofs();
      const latest = proofs.find((p) => p.requestId === request.id);
      const verified = await verifyProof(latest?.id ?? 'missing', request);
      if (latest) fulfillRequest(request.id);
      setResult(verified);
      refresh();
    } finally {
      setResultBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader
        title="Verification requests"
        description="Publish requirements, not questions about people. Applicants respond with private proofs; you receive claims."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Create verification
          </Button>
        }
      />

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="surface-bright rounded-2xl p-6">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="req-name">Verification name</Label>
                    <Input
                      id="req-name"
                      className="mt-1.5"
                      placeholder="Hackathon Grant"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="req-org">Organization</Label>
                    <Input
                      id="req-org"
                      className="mt-1.5"
                      placeholder="HackSpire Foundation"
                      value={form.organization}
                      onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="req-desc">Description</Label>
                    <Textarea
                      id="req-desc"
                      className="mt-1.5"
                      placeholder="Regional grant for builders shipping on privacy infrastructure."
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <fieldset>
                    <legend className="text-[13px] font-medium text-fog-300">Requirements</legend>
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                      {REQUIREMENTS.map((req) => {
                        const checked = requirements.includes(req.id);
                        return (
                          <label
                            key={req.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] transition-colors',
                              checked
                                ? 'border-nova-400/50 bg-nova-500/10 text-fog-100'
                                : 'border-line bg-ink-900/50 text-fog-400 hover:border-line-bright',
                            )}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggle(req.id)}
                            />
                            <span
                              aria-hidden
                              className={cn(
                                'flex size-4 items-center justify-center rounded border text-[10px]',
                                checked ? 'border-nova-400 bg-nova-500 text-white' : 'border-line-bright',
                              )}
                            >
                              {checked ? '✓' : ''}
                            </span>
                            {req.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  {formError && <p role="alert" className="text-[13px] text-bad">{formError}</p>}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[12px] text-fog-600">
                      {requirements.length} requirement{requirements.length === 1 ? '' : 's'} · 0 attributes collected
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={submit} disabled={submitting}>
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Create request
                      </Button>
                    </div>
                  </div>
                </div>
                <PolicyComposer onApply={(ids) => setRequirements(ids as RequirementId[])} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section aria-labelledby="my-requests">
        <h2 id="my-requests" className="mb-4 text-lg font-semibold tracking-tight">
          Your verifications
        </h2>
        {requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No verifications yet"
            description="Create a verification request to define what applicants must privately prove."
            action={
              <Button size="sm" onClick={() => setCreating(true)}>
                Create your first verification
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => {
              const isBuiltin = ['req_hackspire_grant', 'req_public_goods_round2'].includes(request.id);
              return (
                <li key={request.id} className="surface flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate text-sm font-medium">{request.name}</p>
                      {isBuiltin && <Badge tone="neutral">public</Badge>}
                      <Badge tone={request.status === 'open' ? 'accent' : 'verified'}>{request.status}</Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-fog-600">
                      {request.organization} · {request.requirements.join(' · ')} · {formatRelativeTime(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isBuiltin && <CopyButton value={shareUrl(request.id)} />}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={resultBusy && selected?.id === request.id}
                      onClick={() => viewResult(request)}
                    >
                      <ShieldCheck className="size-3.5" />
                      Check result
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AnimatePresence>
        {result && (
          <motion.div
            id="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Verification result</h2>
            <VerifyResult result={result} />
          </motion.div>
        )}
      </AnimatePresence>

      <section aria-labelledby="orgs">
        <h2 id="orgs" className="mb-4 text-lg font-semibold tracking-tight">
          Organizations
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(
            requests.reduce<Record<string, number>>((acc, r) => {
              acc[r.organization] = (acc[r.organization] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([org, count]) => (
            <div key={org} className="surface flex items-center justify-between rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-medium">{org}</p>
                <p className="mt-0.5 text-[12px] text-fog-600">{count} verification{count === 1 ? '' : 's'}</p>
              </div>
              <Badge tone="neutral">claims-only</Badge>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[12px] leading-relaxed text-fog-600">
        Engine mode: {midnightConfig().mode === 'ledger' ? 'bound to Midnight ledger' : 'local proof engine'} ·
        results above reflect proofs from this device. In production, proofs arrive through your
        webhook endpoint instead.
      </p>
    </div>
  );
}
