'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ModeBadge } from '@/components/site/ModeBadge';
import { midnightConfig, networkLabel } from '@/lib/midnight/network';
import {
  connectWallet,
  detectProviders,
  providerLabel,
  truncateAddress,
  type MidnightWalletProvider,
} from '@/lib/midnight/wallet';
import { EASE } from '@/components/motion/reveal';
import { useNova, useToastApi } from '@/lib/store';

export default function WalletModal() {
  const open = useNova((s) => s.walletModalOpen);
  const setOpen = useNova((s) => s.setWalletModalOpen);
  const wallet = useNova((s) => s.wallet);
  const setWallet = useNova((s) => s.setWallet);
  const setWalletStatus = useNova((s) => s.setWalletStatus);
  const toast = useToastApi();

  const [providers, setProviders] = useState<MidnightWalletProvider[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => setProviders(detectProviders()), []);
  useEffect(refresh, [refresh, open]);

  const connect = async (provider?: MidnightWalletProvider) => {
    setBusy(provider ? providerLabel(provider) : 'default');
    setError(null);
    setWalletStatus('connecting');
    try {
      const session = await connectWallet(provider);
      setWallet(session);
      window.sessionStorage.setItem('nova.wallet', JSON.stringify(session));
      toast.success(`Connected via ${session.providerName}`, 'You can now issue and prove credentials.');
      setOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Wallet connection failed.';
      setError(message);
      useNova.getState().setWalletError(message);
      setWalletStatus('disconnected');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-nova-300" />
            {wallet ? 'Wallet connected' : 'Connect Midnight wallet'}
          </DialogTitle>
          <DialogDescription>
            {wallet
              ? 'Your session stays on this device. NØVA never sees your keys.'
              : 'NØVA uses the official Midnight DApp connector. Your keys never leave your wallet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <ModeBadge />
          <Badge tone="mono">{networkLabel(midnightConfig())}</Badge>
        </div>

        {wallet ? (
          <div className="surface rounded-xl p-4">
            <p className="text-[13px] text-fog-500">{wallet.providerName} · connector {wallet.api.toUpperCase()}</p>
            <p className="mt-1 font-mono text-sm text-fog-100">
              {wallet.address ? truncateAddress(wallet.address, 10) : wallet.publicKey ? truncateAddress(wallet.publicKey, 10) : '—'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setWallet(null);
                  window.sessionStorage.removeItem('nova.wallet');
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : providers.length > 0 ? (
          <div className="flex flex-col gap-2">
            {providers.map((p) => (
              <button
                key={providerLabel(p)}
                onClick={() => connect(p)}
                disabled={busy !== null}
                className="surface group flex items-center gap-3 rounded-xl p-4 text-left transition-colors hover:border-nova-400/40 disabled:opacity-60"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-ink-800 text-nova-300">
                  {busy === providerLabel(p) ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{providerLabel(p)}</span>
                  <span className="block text-xs text-fog-600">
                    {typeof p.connect === 'function' ? 'DApp connector v4' : 'Legacy connector'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="surface rounded-xl p-5"
          >
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
              <div>
                <p className="text-sm font-medium">No Midnight wallet detected</p>
                <p className="mt-1 text-[13px] leading-relaxed text-fog-500">
                  Install <span className="text-fog-300">1AM Wallet</span> or{' '}
                  <span className="text-fog-300">Midnight Lace</span> to connect on a real browser.
                  Everything in NØVA still runs on the local proof engine without a wallet.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={refresh}>
                Re-scan
              </Button>
              <Button variant="ghost" size="sm" onClick={() => connect()}>
                Try anyway
              </Button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              className="text-[13px] text-bad"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
