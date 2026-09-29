'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { ToastViewport } from '@/components/ui/toast';
import { useNova } from '@/lib/store';

const WalletModal = dynamic(() => import('@/components/site/WalletModal'), { ssr: false });

/** Restores a persisted wallet session and mounts global overlays. */
export function Providers({ children }: { children: React.ReactNode }) {
  const setWallet = useNova((s) => s.setWallet);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem('nova.wallet');
      if (saved) setWallet(JSON.parse(saved));
    } catch {
      /* session restore is best-effort */
    }
  }, [setWallet]);

  return (
    <>
      {children}
      <ToastViewport />
      <WalletModal />
    </>
  );
}
