/*
 * NØVA — resumable genesis sync for a deployment wallet.
 *
 * A single process replaying Midnight's full ledger OOMs the V8 heap
 * (~6.6GB observed on preprod). This driver runs one bounded "chunk" of the
 * sync per process: restore the checkpoint (or start from genesis), replay
 * until [fully synced | heap watermark | chunk time cap], persist the
 * wallet checkpoint atomically, and exit so the supervisor can start the
 * next chunk from the saved cursor. Progress is enforced: a chunk that
 * advances the dust cursor by < MIN_PROGRESS events twice in a row aborts
 * with exit 1 instead of spinning.
 *
 * Exit codes: 0 = wallet fully synced (safe to deploy); 75 = chunk done,
 * more needed (EX_TEMPFAIL); anything else = hard failure.
 *
 *   npx tsx scripts/sync-chunks.ts [preview|preprod]
 */

import v8 from 'node:v8';
import { pino } from 'pino';
import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { WebSocket } from 'ws';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { NovaWalletProvider, checkpointDustIndex, isWalletSynced, wasRestoredFromCheckpoint, writeCheckpointEnvelope } from './lib/wallet-provider.js';
import { loadEnvFiles } from './lib/env.js';

// @ts-expect-error — WebSocket polyfill required by the indexer client on Node
globalThis.WebSocket = WebSocket;

const logger = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const ENDPOINTS: Record<'preprod' | 'preview', EnvironmentConfiguration> = {
  preprod: {
    walletNetworkId: 'preprod',
    networkId: 'preprod',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    nodeWS: 'wss://rpc.preprod.midnight.network',
    faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
    proofServer: process.env.PROOF_SERVER_URL ?? 'http://localhost:6300',
  },
  preview: {
    walletNetworkId: 'preview',
    networkId: 'preview',
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preview.midnight.network',
    nodeWS: 'wss://rpc.preview.midnight.network',
    faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
    proofServer: process.env.PROOF_SERVER_URL ?? 'http://localhost:6300',
  },
};

async function main(): Promise<void> {
  const network = (process.argv[2] ?? 'preview') as 'preprod' | 'preview';
  const env = ENDPOINTS[network];
  if (!env) {
    logger.error(`unsupported network ${network}`);
    process.exit(1);
  }
  loadEnvFiles();
  const seed = process.env[`MIDNIGHT_${network.toUpperCase()}_SEED`] ?? process.env.MIDNIGHT_WALLET_SEED;
  if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
    logger.error(`MIDNIGHT_${network.toUpperCase()}_SEED (64-hex) is required in .env.local.`);
    process.exit(1);
  }

  const chunkCapMs = Number(process.env.SYNC_CHUNK_MAX_MS ?? 15 * 60_000);
  const heapLimitMB = Number(process.env.SYNC_HEAP_LIMIT_MB ?? 5_500);
  const minProgressEvents = BigInt(process.env.SYNC_MIN_PROGRESS ?? 1);
  const startIndex = checkpointDustIndex(network, seed);

  logger.info(`Sync chunk starting from dust appliedIndex ${startIndex} (heap cap ${heapLimitMB}MB, cap ${Math.round(chunkCapMs / 1000)}s)…`);

  const provider = await NovaWalletProvider.build(logger, env, seed);
  await provider.start();
  const wallet = provider.wallet;

  const started = Date.now();
  let lastState: unknown;
  let lastDustIndex = startIndex;
  let lastLog = 0;
  let synced = false;
  let reason = 'chunk-cap';

  const memMB = () => Math.round(v8.getHeapStatistics().used_heap_size / 1024 / 1024);

  while (!synced) {
    lastState = await firstValueFrom(wallet.state().pipe(Rx.auditTime(1_000), Rx.take(1)));
    synced = isWalletSynced(lastState);
    const st = lastState as { dust: { progress?: { appliedIndex?: bigint } } };
    const idx = BigInt(st.dust.progress?.appliedIndex ?? 0n);
    if (idx > lastDustIndex && Date.now() - lastLog > 30_000) {
      logger.info(`dust cursor ${idx}, heap ${memMB()}MB, ${Math.round((Date.now() - started) / 1000)}s into chunk`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const big = (_k: string, v: unknown) => (typeof v === 'bigint' ? String(v) : v);
      const s = lastState as Record<string, any>;
      const flag = (o: any) => (typeof o?.isStrictlyComplete === 'function' ? o.isStrictlyComplete() : 'n/a');
      logger.info({
        complete: {
          dust: flag(s.dust?.state?.progress ?? s.dust?.progress),
          shielded: flag(s.shielded?.state?.progress),
          unshielded: flag(s.unshielded?.progress),
        },
        progress: {
          dust: JSON.stringify(s.dust?.progress, big),
          shielded: JSON.stringify(s.shielded?.state?.progress ?? s.shielded?.progress, big),
          unshielded: JSON.stringify(s.unshielded?.progress, big),
        },
      }, 'per-stream sync progress');
      lastLog = Date.now();
    }
    lastDustIndex = idx > lastDustIndex ? idx : lastDustIndex;
    if (synced) {
      reason = 'synced';
      break;
    }
    if (memMB() > heapLimitMB) {
      reason = 'heap-watermark';
      break;
    }
    if (Date.now() - started > chunkCapMs) {
      reason = 'chunk-cap';
      break;
    }
  }

  const writingCheckpoint = process.env.CHECKPOINT_WRITE !== '0';
  let cursor = lastDustIndex;
  try {
    if (lastState && writingCheckpoint) {
      writeCheckpointEnvelope(logger, lastState, network, seed);
      cursor = checkpointDustIndex(network, seed);
    }
  } catch (error) {
    logger.error(`Final checkpoint write failed: ${error instanceof Error ? error.message : 'unknown'}`);
  }
  await provider.stop().catch(() => {});

  // Report progress in the checkpoint's own convention — "the last event the
  // state actually applied". A restored process counts one higher (the
  // load-time bump is ours, not an applied event) and, in probe mode, nothing
  // was persisted to correct it. Counting that phantom as progress is exactly
  // what let ~26 dead chunks look alive to the supervisor on preprod.
  if (!writingCheckpoint && wasRestoredFromCheckpoint()) cursor -= 1n;
  const gained = cursor > startIndex ? cursor - startIndex : 0n;

  if (synced) {
    logger.info(`✅ Wallet fully synced (dust appliedIndex ${cursor}). Ready to deploy.`);
    process.exit(0);
  }
  logger.info(`Chunk finished (${reason}): dust advanced ${startIndex} → ${cursor} (+${gained}).`);
  logger.info(`chunk result: reason=${reason} applied=${gained} cursor=${cursor}`);
  if (gained < minProgressEvents && startIndex !== 0n) {
    logger.error('Sync stalled: this chunk gained fewer than the minimum progress events. Not looping — inspect indexer/chain state.');
    process.exit(1);
  }
  process.exit(75);
}

void main().catch((error: unknown) => {
  logger.error({ error: error instanceof Error ? error.message : String(error), detail: String(error) }, 'Chunk crashed.');
  process.exit(1);
});
