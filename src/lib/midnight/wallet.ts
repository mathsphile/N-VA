/**
 * Midnight wallet connection via the official DApp Connector surface.
 *
 * Supports the v4 connector API (1AM Wallet, current Lace) exposed under
 * the `window.midnight` namespace, and the legacy `enable()` shape. No
 * fabricated accounts, no mock balances: if no injected provider exists
 * the UI shows install guidance.
 */

import { midnightConfig } from './network';

export interface WalletSession {
  providerName: string;
  api: 'v4' | 'legacy';
  address: string | null;
  publicKey: string | null;
}

interface ConnectorSession {
  getUnshieldedAddress?: () => Promise<{ unshieldedAddress: string } | string>;
  getShieldedAddresses?: () => Promise<Array<{ shieldedAddress: string; shieldedCoinPublicKey?: string }> | string[]>;
  getDustAddress?: () => Promise<{ dustAddress: string } | string>;
  state?: () => Promise<{ coinPublicKey?: string; address?: string }>;
}

export interface MidnightWalletProvider {
  name?: string;
  icon?: string;
  rdns?: string;
  apiVersion?: string;
  connect?: (networkId: string) => Promise<ConnectorSession>;
  enable?: () => Promise<ConnectorSession>;
  isEnabled?: () => Promise<boolean>;
}

function looksLikeProvider(value: unknown): value is MidnightWalletProvider {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as MidnightWalletProvider;
  return typeof p.connect === 'function' || typeof p.enable === 'function';
}

export function detectProviders(): MidnightWalletProvider[] {
  if (typeof window === 'undefined') return [];
  const found = new Map<string, MidnightWalletProvider>();
  const scan = (key: string, candidate: unknown) => {
    if (looksLikeProvider(candidate) && !found.has(key)) found.set(key, candidate);
  };
  const namespace = (window as unknown as { midnight?: Record<string, unknown> }).midnight;
  for (const [key, provider] of Object.entries(namespace ?? {})) scan(key, provider);
  scan('lace', (window as unknown as { lace?: unknown }).lace);
  return [...found.values()];
}

export function providerLabel(provider: MidnightWalletProvider): string {
  const raw = provider.name ?? 'Midnight Wallet';
  if (/lace/i.test(raw)) return 'Midnight Lace';
  if (/1am|oneam/i.test(raw)) return '1AM Wallet';
  return raw;
}

async function readAddress(session: ConnectorSession): Promise<string | null> {
  try {
    const unshielded = await session.getUnshieldedAddress?.();
    if (typeof unshielded === 'string') return unshielded;
    if (unshielded && 'unshieldedAddress' in unshielded) return unshielded.unshieldedAddress;
    const shielded = await session.getShieldedAddresses?.();
    if (typeof shielded === 'string') return shielded;
    if (Array.isArray(shielded) && shielded[0]) {
      return typeof shielded[0] === 'string' ? shielded[0] : shielded[0].shieldedAddress;
    }
    const state = await session.state?.();
    return state?.address ?? null;
  } catch {
    return null;
  }
}

async function readPublicKey(session: ConnectorSession): Promise<string | null> {
  try {
    const state = await session.state?.();
    if (state?.coinPublicKey) return state.coinPublicKey;
    const shielded = await session.getShieldedAddresses?.();
    if (Array.isArray(shielded) && shielded[0] && typeof shielded[0] !== 'string') {
      return shielded[0].shieldedCoinPublicKey ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export function truncateAddress(address: string, span = 6): string {
  if (address.length <= span * 2 + 3) return address;
  return `${address.slice(0, span)}…${address.slice(-span)}`;
}

/** Connect the first available injected provider (or a chosen one). */
export async function connectWallet(preferred?: MidnightWalletProvider): Promise<WalletSession> {
  const provider = preferred ?? detectProviders()[0];
  if (!provider) {
    throw new Error(
      'No Midnight wallet detected. Install Midnight Lace or 1AM Wallet to connect.',
    );
  }
  const { networkId } = midnightConfig();
  const api: 'v4' | 'legacy' = typeof provider.connect === 'function' ? 'v4' : 'legacy';
  const session =
    api === 'v4'
      ? await provider.connect!.call(provider, networkId)
      : await provider.enable!.call(provider);

  const address = await readAddress(session);
  const publicKey = await readPublicKey(session);
  if (!address && !publicKey) {
    throw new Error(`${providerLabel(provider)} did not expose an account. Unlock the wallet and retry.`);
  }
  return { providerName: providerLabel(provider), api, address, publicKey };
}
