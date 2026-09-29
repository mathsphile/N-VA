import { NextResponse } from 'next/server';
import { ledgerReady, midnightConfig } from '@/lib/midnight/network';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ledger/state
 *
 * Server-side read of the deployed NØVA contract's PUBLIC state through the
 * Midnight indexer. Compact contracts expose only aggregates and one-way
 * commitments — decode happens with the generated ledger accessor from the
 * `nova-contract` workspace. In simulation mode this answers a structured
 * 503 so the UI keeps its honest-mode badge.
 */

type IdxModule = typeof import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
type IndexerProvider = ReturnType<IdxModule['indexerPublicDataProvider']>;

// One provider per indexer URL — creating a fresh one per request leaks a
// WebSocket per GET and stalls under upstream hiccups.
const providers = new Map<string, IndexerProvider>();

async function getProvider(indexerUrl: string): Promise<IndexerProvider> {
  const existing = providers.get(indexerUrl);
  if (existing) return existing;
  const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
  const provider = indexerPublicDataProvider(
    indexerUrl,
    indexerUrl.replace('https://', 'wss://') + '/ws',
  );
  providers.set(indexerUrl, provider);
  return provider;
}

const QUERY_TIMEOUT_MS = 15_000;

export async function GET(): Promise<NextResponse> {
  const cfg = midnightConfig();
  if (!ledgerReady(cfg) || !cfg.contractId || !cfg.indexerUrl) {
    return NextResponse.json(
      { error: 'Ledger mode is not configured; NØVA is running the local proof engine.' },
      { status: 503 },
    );
  }
  try {
    const { RegistryStatus, ledger: decodeLedger } = await import('nova-contract');
    const provider = await getProvider(cfg.indexerUrl);
    const state = await Promise.race([
      provider.queryContractState(cfg.contractId as never),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Indexer did not answer within ${QUERY_TIMEOUT_MS / 1000}s.`)), QUERY_TIMEOUT_MS),
      ),
    ]);
    if (!state) {
      return NextResponse.json({ error: 'Contract not found on the indexer yet.' }, { status: 404 });
    }
    const l = decodeLedger(state.data);
    return NextResponse.json({
      network: cfg.networkId,
      contractAddress: cfg.contractId,
      status: RegistryStatus[l.status],
      credentialCount: l.credentialCount.toString(),
      proofCount: l.proofCount.toString(),
      lastAttestation: Buffer.from(l.lastAttestation).toString('hex'),
      lastAttestationScope: Buffer.from(l.lastAttestationScope).toString('hex'),
      queriedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Indexer query failed.' },
      { status: 502 },
    );
  }
}
