'use client';

/**
 * Global client store: wallet session, ephemeral toasts, and
 * invalidation counters for the local vault/proof stores. Deliberately
 * tiny — durable state lives in the encrypted vault and the attestation
 * registry, not in memory.
 */

import { create } from 'zustand';
import type { WalletSession } from './midnight/wallet';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: 'default' | 'success' | 'error';
}

interface NovaState {
  wallet: WalletSession | null;
  walletStatus: 'disconnected' | 'connecting' | 'connected';
  walletError: string | null;
  vaultVersion: number;
  proofsVersion: number;
  toasts: Toast[];
  walletModalOpen: boolean;
  setWallet: (session: WalletSession | null) => void;
  setWalletStatus: (status: NovaState['walletStatus']) => void;
  setWalletError: (error: string | null) => void;
  bumpVault: () => void;
  bumpProofs: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setWalletModalOpen: (open: boolean) => void;
}

let toastId = 0;

export const useNova = create<NovaState>((set) => ({
  wallet: null,
  walletStatus: 'disconnected',
  walletError: null,
  vaultVersion: 0,
  proofsVersion: 0,
  toasts: [],
  walletModalOpen: false,
  setWallet: (wallet) =>
    set({ wallet, walletStatus: wallet ? 'connected' : 'disconnected', walletError: null }),
  setWalletStatus: (walletStatus) => set({ walletStatus }),
  setWalletError: (walletError) => set({ walletError, walletStatus: 'disconnected' }),
  bumpVault: () => set((s) => ({ vaultVersion: s.vaultVersion + 1 })),
  bumpProofs: () => set((s) => ({ proofsVersion: s.proofsVersion + 1 })),
  pushToast: (toast) => set((s) => ({ toasts: [...s.toasts, { ...toast, id: ++toastId }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setWalletModalOpen: (walletModalOpen) => set({ walletModalOpen }),
}));

export function useToastApi() {
  const push = useNova((s) => s.pushToast);
  return {
    success: (title: string, description?: string) => push({ title, description, tone: 'success' }),
    error: (title: string, description?: string) => push({ title, description, tone: 'error' }),
    info: (title: string, description?: string) => push({ title, description, tone: 'default' }),
  };
}
