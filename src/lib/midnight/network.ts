/**
 * Midnight network configuration.
 *
 * NØVA runs in one of two modes:
 *
 *  - "simulation": the local proof engine executes the exact same
 *    circuit semantics as nova.compact client-side (domain-separated
 *    SHA-256 standing in for persistentHash). Clearly surfaced in the
 *    UI — no fake tx hashes, no fake ledger claims.
 *  - "ledger": proofs are bound to a published NØVA Compact contract on
 *    a real Midnight network via @midnight-ntwrk providers.
 */

import type { MidnightMode } from './types';

export interface MidnightConfig {
  mode: MidnightMode;
  networkId: string;
  indexerUrl?: string;
  nodeUrl?: string;
  contractId?: string;
}

export function midnightConfig(): MidnightConfig {
  const mode: MidnightMode =
    process.env.NEXT_PUBLIC_MIDNIGHT_MODE === 'ledger' ? 'ledger' : 'simulation';
  return {
    mode,
    networkId: process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID ?? 'preprod',
    indexerUrl: process.env.NEXT_PUBLIC_MIDNIGHT_INDEXER_URL,
    nodeUrl: process.env.NEXT_PUBLIC_MIDNIGHT_NODE_URL,
    contractId: process.env.NEXT_PUBLIC_MIDNIGHT_CONTRACT_ID,
  };
}

/** True only when a real ledger binding is fully configured. */
export function ledgerReady(cfg: MidnightConfig = midnightConfig()): boolean {
  return cfg.mode === 'ledger' && Boolean(cfg.indexerUrl && cfg.nodeUrl && cfg.contractId);
}

export const NETWORK_LABELS: Record<string, string> = {
  preprod: 'Midnight preprod',
  preview: 'Midnight preview',
  mainnet: 'Midnight mainnet',
};

export function networkLabel(cfg: MidnightConfig = midnightConfig()): string {
  if (cfg.mode === 'simulation') return 'Local proof engine';
  return NETWORK_LABELS[cfg.networkId ?? ''] ?? `Midnight ${cfg.networkId}`;
}
