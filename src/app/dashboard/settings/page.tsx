'use client';

import { AlertTriangle, Cpu, Radio, Trash2, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clearVault } from '@/lib/midnight/credentials';
import { midnightConfig, networkLabel } from '@/lib/midnight/network';
import { NOVA_CIRCUITS } from '@/lib/midnight/contracts';
import { truncateAddress } from '@/lib/midnight/wallet';
import { useNova, useToastApi } from '@/lib/store';

interface LedgerAggregates {
  status: string;
  credentialCount: string;
  proofCount: string;
  lastAttestation: string;
}

export default function SettingsPage() {
  const wallet = useNova((s) => s.wallet);
  const toast = useToastApi();
  const cfg = midnightConfig();
  const [wipeOpen, setWipeOpen] = useState(false);
  const [ledgerState, setLedgerState] = useState<LedgerAggregates | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (cfg.mode !== 'ledger') return;
    let cancelled = false;
    fetch('/api/ledger/state', { signal: AbortSignal.timeout(15_000) })
      .then(async (r) => {
        const data = (await r.json()) as Partial<LedgerAggregates> & { error?: string };
        if (cancelled) return;
        if (!r.ok || data.error) setLedgerError(data.error ?? `HTTP ${r.status}`);
        else setLedgerState(data as LedgerAggregates);
      })
      .catch((e: unknown) => !cancelled && setLedgerError(e instanceof Error ? e.message : 'query failed'));
    return () => {
      cancelled = true;
    };
  }, [cfg.mode]);

  const wipe = async () => {
    await clearVault();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('nova.proofs.v1');
      window.localStorage.removeItem('nova.requests.v1');
      window.localStorage.removeItem('nova.activity.v1');
      window.localStorage.removeItem('nova.attested.v1');
    }
    setWipeOpen(false);
    setWipeConfirm('');
    useNova.getState().bumpVault();
    useNova.getState().bumpProofs();
    toast.success('Vault destroyed', 'All local credentials, proofs and history were deleted.');
  };

  const ledgerDetail = `${NOVA_CIRCUITS.length} Compact circuits compiled from nova.compact · network id ${cfg.networkId}${
    cfg.mode === 'ledger' ? ' · public state via indexer' : ''
  }`;

  const rows = [
    {
      icon: Radio,
      label: 'Engine mode',
      value: cfg.mode === 'ledger' ? 'Midnight ledger binding' : 'Local proof engine (simulation)',
      detail:
        cfg.mode === 'ledger'
          ? `network ${cfg.networkId} · contract ${cfg.contractId ? truncateAddress(cfg.contractId, 8) : 'pending'}`
          : 'Set NEXT_PUBLIC_MIDNIGHT_MODE=ledger + a published contract id to bind attestations on-chain.',
    },
    {
      icon: Cpu,
      label: 'Network surface',
      value: networkLabel(cfg),
      detail: ledgerDetail,
    },
    ...(cfg.mode === 'ledger'
      ? [
          {
            icon: Radio,
            label: 'On-chain aggregates (Nova contract)',
            value: ledgerState
              ? `${ledgerState.status} · ${ledgerState.credentialCount} credentials · ${ledgerState.proofCount} proofs`
              : ledgerError
                ? `unreachable: ${ledgerError}`
                : 'querying indexer…',
            detail: cfg.contractId
              ? `contract ${truncateAddress(cfg.contractId, 10)} · read via indexer GraphQL — commitments and counters only`
              : 'no contract id configured',
          },
        ]
      : []),
    {
      icon: Wallet,
      label: 'Wallet',
      value: mounted ? (wallet ? `${wallet.providerName} · ${truncateAddress(wallet.address ?? wallet.publicKey ?? '')}` : 'Not connected') : '—',
      detail: wallet ? `Connector API ${wallet.api.toUpperCase()} · session held in this tab only` : 'Connect a Midnight wallet for ledger-bound proofs.',
    },
    {
      icon: AlertTriangle,
      label: 'Data custody',
      value: 'This device',
      detail: 'Credentials are AES-GCM encrypted under a device key. Losing this device means losing the vault — by design.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title="Settings"
        description="Environment, custody and session state. NØVA stores no profile of you anywhere."
      />

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="surface flex items-start gap-4 rounded-xl p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-nova-300">
              <row.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] text-fog-500">{row.label}</p>
                <Badge tone={row.label === 'Engine mode' && cfg.mode === 'simulation' ? 'accent' : 'neutral'}>
                  {row.value}
                </Badge>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-fog-600">{row.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-bad/20 bg-bad/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-bad">Destroy vault</p>
            <p className="mt-1 text-[13px] text-fog-500">
              Permanently deletes all local credentials, proofs, requests and activity on this device.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setWipeOpen(true)}>
            <Trash2 className="size-3.5" />
            Destroy
          </Button>
        </div>
      </div>

      <Dialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Destroy local vault?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type <span className="font-mono text-fog-200">destroy</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="wipe" className="sr-only">Confirmation</Label>
          <Input
            id="wipe"
            value={wipeConfirm}
            onChange={(e) => setWipeConfirm(e.target.value)}
            placeholder="destroy"
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setWipeOpen(false)}>
              Keep vault
            </Button>
            <Button variant="destructive" size="sm" disabled={wipeConfirm !== 'destroy'} onClick={wipe}>
              Destroy everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
