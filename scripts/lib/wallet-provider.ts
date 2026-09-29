/*
 * NØVA — Midnight wallet provider for server-side contract operations.
 *
 * Implements `MidnightProvider` + `WalletProvider` for
 * @midnight-ntwrk/midnight-js-contracts.
 *
 * Sync strategy (the v4 indexer no longer serves the per-block dust-event
 * queries the old snapshot trick relied on, so booting from genesis replayed
 * ~1.6M dust events on preprod and ~400k on preview — the deployment
 * bottleneck):
 *
 *   1. First run per (network, seed): build the wallet through the official
 *      testkit FluentWalletBuilder (full replay) and, once synced, persist a
 *      wallet checkpoint via the SDK's supported `serialize()` round-trip.
 *   2. Later runs: restore the three sub-wallets from that checkpoint
 *      (`DustWallet/ShieldedWallet/UnshieldedWallet(config).restore(json)`)
 *      and let the indexer subscriptions catch up from the stored cursor —
 *      seconds instead of tens of minutes.
 *   3. Transactions submit through the node's midnight.sendMnTransaction
 *      extrinsic when a checkpoint-restored facade is used (proven path from
 *      the Night Access workspace); a restore failure always falls back to
 *      the fresh testkit build, so deployment never dead-ends.
 *
 * Checkpoint files are SECRET MATERIAL (they contain wallet private state:
 * dust nullifiers, viewing keys). They live in .wallet-cache/ (git-ignored,
 * mode 0600) and are never logged.
 */

import {
  type CoinPublicKey,
  DustSecretKey,
  type EncPublicKey,
  type FinalizedTransaction,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type MidnightProvider,
  type UnboundTransaction,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import {
  type DustWalletOptions,
  type EnvironmentConfiguration,
  FluentWalletBuilder,
} from '@midnight-ntwrk/testkit-js';
import { InMemoryTransactionHistoryStorage, SerializedTransaction } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { WalletEntrySchema, WalletFacade as WalletFacadeImpl, mergeWalletEntries } from '@midnight-ntwrk/wallet-sdk-facade';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { SubmissionEvent } from '@midnight-ntwrk/wallet-sdk-node-client/effect';
import { PublicKey, UnshieldedWallet, createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from 'pino';
import * as Rx from 'rxjs';

export interface UnshieldedKeystore {
  getPublicKey(): unknown;
  signData(payload: Uint8Array): string;
}

type WalletFacade = WalletFacadeImpl;

const CHECKPOINT_VERSION = 1;

function deriveKeyForRole(seed: string, role: (typeof Roles)[keyof typeof Roles]): Uint8Array {
  const result = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (result.type !== 'seedOk') throw new Error('Invalid seed: failed to create HD wallet');
  const derived = result.hdWallet.selectAccount(0).selectRole(role).deriveKeyAt(0);
  if (derived.type === 'keyOutOfBounds') throw new Error('Key out of bounds');
  return derived.key;
}

const getInitialUnshieldedState = async (wallet: WalletFacade) =>
  Rx.firstValueFrom(wallet.unshielded.state);

type CheckpointEnvelope = {
  version: number;
  network: string;
  savedAt: string;
  dust: string;
  shielded: string;
  unshielded: string;
  dustAppliedIndex: string;
};

function checkpointFile(network: string, seed: string): string {
  const fingerprint = createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return path.resolve(process.cwd(), '.wallet-cache', `${network}-${fingerprint}.json`);
}

/**
 * Only one process may own a network's checkpoint. Two supervisors replaying
 * the same seed each persisted their own cursor, so one run's phantom load
 * bump landed inside another run's state and the dust tree drifted. A live
 * holder aborts the second run instead of silently corrupting the cache.
 */
let heldLockFile: string | undefined;

function acquireCheckpointLock(network: string, seed: string): void {
  if (process.env.CHECKPOINT_LOCK === '0') return;
  const lock = `${checkpointFile(network, seed)}.lock`;
  try {
    const holder = Number(fs.readFileSync(lock, 'utf8'));
    if (holder > 0 && holder !== process.pid) {
      process.kill(holder, 0); // throws ESRCH when the holder is gone
      throw new Error(
        `checkpoint for ${network} is held by pid ${holder} — stop that run before starting another`,
      );
    }
  } catch (error) {
    const message = (error as Error)?.message ?? '';
    if (message.includes('is held by pid')) throw error;
    if ((error as NodeJS.ErrnoException)?.code === 'EPERM') {
      throw new Error(`checkpoint for ${network} is locked by pid of another user`);
    }
    // ENOENT / unreadable / dead pid — stale lock, take it over
  }
  fs.mkdirSync(path.dirname(lock), { recursive: true, mode: 0o700 });
  fs.writeFileSync(lock, String(process.pid), { mode: 0o600 });
  heldLockFile = lock;
  process.once('exit', releaseCheckpointLock);
}

function releaseCheckpointLock(): void {
  if (!heldLockFile) return;
  try {
    if (Number(fs.readFileSync(heldLockFile, 'utf8')) === process.pid) fs.unlinkSync(heldLockFile);
  } catch { /* already gone */ }
  heldLockFile = undefined;
}

/**
 * Serialize the wallet's current (possibly mid-sync) state into the cache
 * file. `probe` mode (CHECKPOINT_WRITE=0) measures a resume without moving
 * the cursor, which the calibration driver relies on.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeCheckpointEnvelope(logger: Logger, state: any, network: string, seed: string): string {
  const file = checkpointFile(network, seed);
  if (process.env.CHECKPOINT_WRITE === '0') return file;
  acquireCheckpointLock(network, seed);
  // Undo this process's own load-time bump so the file keeps the "last
  // applied" convention it was read with (see persistedCursorIsBumped).
  const settle = (serialized: string): string =>
    persistedCursorIsBumped ? shiftCursor(serialized, -1n) : serialized;
  const envelope: CheckpointEnvelope = {
    version: CHECKPOINT_VERSION,
    network,
    savedAt: new Date().toISOString(),
    dust: settle(state.dust.serialize()),
    shielded: settle(state.shielded.serialize()),
    unshielded: state.unshielded.serialize(),
    dustAppliedIndex: String(BigInt(state.dust.progress?.appliedIndex ?? 0n) - (persistedCursorIsBumped ? 1n : 0n)),
  };
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(envelope), { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, file); // atomic — a crash can't corrupt the live checkpoint
  // Plain-text cursor sidecar so the (dumb, external) supervisor can measure
  // progress across chunk deaths of any kind — including OOM kills that skip
  // the graceful save.
  fs.writeFileSync(path.join(path.dirname(file), `LATEST-${network}.cursor`), envelope.dustAppliedIndex);
  logger.info(`Checkpoint written (dust appliedIndex ${envelope.dustAppliedIndex}).`);
  return file;
}

/** Pin a stream's stored cursor to an absolute event index (checkpoint repair). */
export function setCheckpointOffset(
  network: string,
  seed: string,
  stream: 'dust' | 'shielded',
  offset: bigint,
): void {
  const envelope = loadCheckpoint(network, seed);
  if (!envelope) throw new Error(`no ${network} checkpoint to repair`);
  const current = BigInt(String(readCursor(envelope[stream]) ?? 0n));
  envelope[stream] = shiftCursor(envelope[stream], offset - current);
  if (stream === 'dust') envelope.dustAppliedIndex = String(offset);
  const file = checkpointFile(network, seed);
  acquireCheckpointLock(network, seed);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(envelope), { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, file);
  fs.writeFileSync(path.join(path.dirname(file), `LATEST-${network}.cursor`), String(offset));
}

export function checkpointDustIndex(network: string, seed: string): bigint {
  try {
    const cp = loadCheckpoint(network, seed);
    return cp ? BigInt(cp.dustAppliedIndex ?? '0') : 0n;
  } catch {
    return 0n;
  }
}

function loadCheckpoint(network: string, seed: string): CheckpointEnvelope | undefined {
  const file = checkpointFile(network, seed);
  try {
    if (!fs.existsSync(file)) return undefined;
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as CheckpointEnvelope;
    if (data.version !== CHECKPOINT_VERSION || data.network !== network) return undefined;
    if (!data.dust || !data.shielded || !data.unshielded) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

const isProgressComplete = (progress: unknown): boolean => {
  if (!progress || typeof progress !== 'object') return false;
  const candidate = progress as { isStrictlyComplete?: unknown };
  return typeof candidate.isStrictlyComplete === 'function'
    ? (candidate.isStrictlyComplete as () => boolean)()
    : false;
};

export const isWalletSynced = (state: unknown): boolean => isSynced(state);

const isSynced = (state: unknown): boolean => {
  const s = state as {
    shielded?: { state?: { progress?: unknown } };
    dust?: { state?: { progress?: unknown } };
    unshielded?: { progress?: unknown };
  };
  return (
    isProgressComplete(s.shielded?.state?.progress) &&
    isProgressComplete(s.dust?.state?.progress) &&
    isProgressComplete(s.unshielded?.progress)
  );
};

/**
 * Detached watcher: persist a checkpoint every CHECKPOINT_EVERY_MS while the
 * wallet syncs (mid-replay saves make genesis replay resumable across process
 * restarts — the preprod replay OOMs a single process otherwise), and a final
 * save when the facade reports fully-synced, after which the watcher stops.
 * Checkpoint content is SECRET MATERIAL (dust nullifiers, viewing keys) —
 * mode 600, private dir, never logged. Failures are logged, never fatal.
 */
function watchAndSaveCheckpoint(
  logger: Logger,
  wallet: WalletFacade,
  network: string,
  seed: string,
): void {
  const subscription = wallet.state().pipe(
    // Cadence must stay BELOW typical chunk lifetime (~4 min to the heap
    // ceiling), otherwise a hard death loses every event applied since the
    // last save and the supervisor's progress test degrades.
    Rx.sampleTime(Number(process.env.CHECKPOINT_EVERY_MS ?? 120_000)),
  ).subscribe({
    next: (state) => {
      try {
        writeCheckpointEnvelope(logger, state, network, seed);
      } catch (error) {
        logger.warn(`Checkpoint save failed (${error instanceof Error ? error.message : 'unknown'}).`);
      }
      if (isSynced(state)) {
        logger.info(`Wallet checkpoint finalized for ${network}.`);
        subscription.unsubscribe();
      }
    },
    error: () => { /* stream ended — the run's own error handling takes over */ },
  });
}

/**
 * The indexer's `dustLedgerEvents(id:)` / equivalent subscriptions replay
 * the cursor event ITSELF (inclusive). A restored snapshot already contains
 * everything up to its cursor, so resuming without a +1 bump re-applies the
 * last event and the WASM commitment tree aborts with
 * "values inserted non-linearly". Bump each serialized wallet's cursor by
 * one event on load.
 *
 * The bumped value is what the running wallet then reports as its own
 * progress, so it must be un-bumped again before persisting — see
 * `persistedCursorIsBumped`. Preprod skipped ~26 real dust events this way
 * before the tree refused to resume at all.
 */
let persistedCursorIsBumped = false;

function readCursor(serialized: string): bigint | undefined {
  const data = JSON.parse(serialized) as Record<string, unknown>;
  const v = data.offset ?? data.appliedId;
  if (typeof v === 'number' && Number.isSafeInteger(v)) return BigInt(v);
  if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
  return undefined;
}

/** Move a serialized sub-wallet's cursor by `delta` events (blob is rewritten, not read). */
function shiftCursor(serialized: string, delta: bigint): string {
  try {
    const data = JSON.parse(serialized) as Record<string, unknown>;
    for (const key of ['offset', 'appliedId']) {
      const v = data[key];
      if (typeof v === 'number' && Number.isSafeInteger(v)) data[key] = Number(BigInt(v) + delta);
      else if (typeof v === 'string' && /^\d+$/.test(v)) data[key] = String(BigInt(v) + delta);
    }
    return JSON.stringify(data);
  } catch {
    return serialized;
  }
}

function bumpRestoreCursor(serialized: string): string {
  return shiftCursor(serialized, 1n);
}

/**
 * Heal an unshielded envelope whose `appliedId` drifted ahead of the real
 * stream end (`highestTransactionId`): its completion predicate requires
 * |highestTransactionId - appliedId| === 0, and a drift can never resolve
 * itself on an idle chain (no newer transactions exist to pull the cap up).
 * Clamp appliedId back to the true scanned position; resubscription re-serves
 * that final transaction, which the wallet's own `<= appliedId` guard skips.
 */
function clampUnshieldedCursor(serialized: string): string {
  try {
    const data = JSON.parse(serialized) as Record<string, unknown>;
    const a = data.appliedId;
    const h = data.highestTransactionId;
    if ((typeof a === 'number' || typeof a === 'string') && (typeof h === 'number' || typeof h === 'string')) {
      if (BigInt(String(a)) > BigInt(String(h))) {
        data.appliedId = typeof a === 'number' ? Number(h) : String(h);
      }
    }
    return JSON.stringify(data);
  } catch {
    return serialized;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// The polkadot submission + wallet-facade wiring below mirrors
// example-bboard's proven preprod path; exact typing of these SDK generics
// is not exposed, so narrow `any` is used locally.
async function buildRestoredProvider(
  logger: Logger,
  env: EnvironmentConfiguration,
  masterSeed: string,
  checkpoint: CheckpointEnvelope,
): Promise<NovaWalletProvider> {
  logger.info(`Restoring ${env.networkId} wallet from checkpoint (saved ${checkpoint.savedAt})…`);
  const shieldedSeed = deriveKeyForRole(masterSeed, Roles.Zswap);
  const unshieldedSeed = deriveKeyForRole(masterSeed, Roles.NightExternal);
  const dustSeed = deriveKeyForRole(masterSeed, Roles.Dust);
  const dustSecretKey = DustSecretKey.fromSeed(dustSeed);
  const zswapSecretKeys = ZswapSecretKeys.fromSeed(shieldedSeed);
  const unshieldedKeystore = createKeystore(unshieldedSeed, env.walletNetworkId);

  const config = {
    indexerClientConnection: { indexerHttpUrl: env.indexer, indexerWSUrl: env.indexerWS },
    provingServerUrl: new URL(env.proofServer),
    networkId: env.walletNetworkId,
    relayURL: new URL(env.nodeWS || env.node.replace(/^http/, 'ws')),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 1000n,
      feeBlocksMargin: 5,
    },
    // Paced, batched ingestion: unthrottled WS updates outrun WASM apply,
    // pile up decoded events in the JS heap, and GC-thrash (observed: 5
    // events/s at 5GB on preprod). Sized/spaced batches bound the queue.
    batchUpdates: {
      size: Number(process.env.WALLET_BATCH_SIZE ?? 100),
      spacing: Number(process.env.WALLET_BATCH_SPACING_MS ?? 200),
      timeout: Number(process.env.WALLET_BATCH_TIMEOUT_MS ?? 10_000),
    },
  };

  // All three subscription streams replay inclusively from their stored
  // cursor; without the +1 bump the last-applied event is re-fed and the
  // WASM linear-insert guards abort (dust: "non-linearly", shielded:
  // replayEventsWithChanges throw). Unshielded is clamped instead because
  // its cursor can also drift ABOVE the stream cap, which no bump can heal.
  acquireCheckpointLock(env.networkId, masterSeed);
  persistedCursorIsBumped = true;
  const shieldedWallet = ShieldedWallet(config).restore(bumpRestoreCursor(checkpoint.shielded));
  const unshieldedWallet = UnshieldedWallet(config).restore(clampUnshieldedCursor(checkpoint.unshielded));
  const dustWallet = DustWallet(config).restore(bumpRestoreCursor(checkpoint.dust));

  const polkadotWs = new WsProvider(env.nodeWS || env.node.replace(/^http/, 'ws'));
  const polkadotApi = await ApiPromise.create({ provider: polkadotWs, noInitWarn: true });

  const customSubmissionService = {
    submitTransaction: async (transaction: any, waitForStatus?: 'Submitted' | 'InBlock' | 'Finalized') => {
      const serialized = SerializedTransaction.from(transaction);
      const hex = u8aToHex(serialized);
      return new Promise<any>((resolve, reject) => {
        const finalizeTimeoutMs = Number(process.env.TX_FINALIZE_TIMEOUT_MS ?? 3 * 60_000);
        let settled = false;
        let lastTxHash = '';
        const safetyTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error(
            `Transaction not finalized within ${Math.round(finalizeTimeoutMs / 1000)}s`
            + ` (txHash: ${lastTxHash || 'not returned by node'}${lastTxHash ? ', still pending inclusion — check the explorer before retrying' : ''})`,
          ));
        }, finalizeTimeoutMs);
        const settle = (event: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(safetyTimer);
          resolve(event);
        };
        polkadotApi.tx.midnight
          .sendMnTransaction(hex)
          .send((result) => {
            lastTxHash = result.txHash.toString();
            if (result.status.isReady || result.status.isBroadcast) {
              if (waitForStatus === 'Submitted') {
                settle(SubmissionEvent.Submitted({ tx: serialized, txHash: lastTxHash }));
              }
              logger.info(`Tx broadcast: ${lastTxHash}`);
            }
            if (result.status.isInBlock && (!waitForStatus || waitForStatus === 'InBlock')) {
              logger.info(`Tx included in block: ${result.status.asInBlock.toHex()}`);
              settle(SubmissionEvent.InBlock({
                tx: serialized,
                blockHash: result.status.asInBlock.toString(),
                blockHeight: 0n,
                txHash: lastTxHash,
              }));
            }
            if (result.status.isFinalized) {
              logger.info(`Tx finalized: ${result.status.asFinalized.toHex()}`);
              settle(SubmissionEvent.Finalized({
                tx: serialized,
                blockHash: result.status.asFinalized.toString(),
                blockHeight: 0n,
                txHash: lastTxHash,
              }));
            }
            if (result.status.isDropped || result.status.isInvalid) {
              if (settled) return;
              settled = true;
              clearTimeout(safetyTimer);
              reject(new Error(`Transaction ${lastTxHash} was ${result.status.type} by the node.`));
            }
          })
          .catch((error: unknown) => {
            if (settled) return;
            settled = true;
            clearTimeout(safetyTimer);
            reject(error);
          });
      });
    },
    close: async () => {
      await polkadotApi.disconnect();
    },
  };

  const walletFacade = await WalletFacadeImpl.init({
    configuration: config as any,
    shielded: () => shieldedWallet,
    unshielded: () => unshieldedWallet,
    dust: () => dustWallet,
    submissionService: () => customSubmissionService,
  });

  const initialState = await getInitialUnshieldedState(walletFacade);
  logger.info(`${env.networkId} wallet restored (initial unshielded coins: ${initialState.availableCoins.length}).`);

  watchAndSaveCheckpoint(logger, walletFacade, env.networkId, masterSeed);

  return new NovaWalletProvider(
    logger,
    walletFacade,
    zswapSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
    polkadotApi,
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class NovaWalletProvider implements MidnightProvider, WalletProvider {
  // Internal use only; external code should go through NovaWalletProvider.build().
  constructor(
    private readonly logger: Logger,
    private readonly walletFacade: WalletFacade,
    private readonly zswapSecretKeys: ZswapSecretKeys,
    private readonly dustSecretKey: DustSecretKey,
    private readonly unshieldedKeystore: UnshieldedKeystore,
    private readonly polkadotApi?: ApiPromise,
  ) {}

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(tx: UnboundTransaction, ttl: Date = ttlOneHour()): Promise<FinalizedTransaction> {
    const recipe = await this.walletFacade.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey },
      { ttl },
    );
    const signedRecipe = await this.walletFacade.signRecipe(recipe, (payload) =>
      this.unshieldedKeystore.signData(payload),
    );
    return this.walletFacade.finalizeRecipe(signedRecipe);
  }

  submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.walletFacade.submitTransaction(tx);
  }

  async start(): Promise<void> {
    this.logger.info('Starting NØVA deploy wallet…');
    await this.walletFacade.start(this.zswapSecretKeys, this.dustSecretKey);
  }

  async stop(): Promise<void> {
    if (this.polkadotApi) await this.polkadotApi.disconnect().catch(() => {});
    return this.walletFacade.stop();
  }

  get wallet(): WalletFacade {
    return this.walletFacade;
  }

  static async build(
    logger: Logger,
    env: EnvironmentConfiguration,
    seed: string,
  ): Promise<NovaWalletProvider> {
    const checkpoint = loadCheckpoint(env.networkId, seed);
    if (checkpoint) {
      // Taken before the restore attempt: a second live run on the same
      // checkpoint must fail loudly, never silently drop to a 5-hour replay.
      acquireCheckpointLock(env.networkId, seed);
      try {
        return await buildRestoredProvider(logger, env, seed, checkpoint);
      } catch (error) {
        logger.warn(
          `Checkpoint restore failed (${error instanceof Error ? error.message : 'unknown'}); falling back to full sync.`,
        );
      }
    }

    const dustOptions: DustWalletOptions = {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: env.walletNetworkId === 'undeployed' ? 500_000_000_000_000_000n : 1_000n,
      feeBlocksMargin: 5,
    };
    const builder = FluentWalletBuilder.forEnvironment(env).withDustOptions(dustOptions);
    const { wallet, seeds, keystore } = (await builder
      .withSeed(seed)
      .buildWithoutStarting()) as unknown as {
      wallet: WalletFacade;
      seeds: { masterSeed: string; shielded: Uint8Array; dust: Uint8Array };
      keystore: UnshieldedKeystore;
    };
    logger.info(`Deploy wallet built (fingerprint ${createHash('sha256').update(seeds.masterSeed).digest('hex').slice(0, 8)}…)`);

    // Full replay in progress — persist a checkpoint when it completes so
    // subsequent runs restore instead of replaying.
    if (env.networkId !== 'undeployed') {
      watchAndSaveCheckpoint(logger, wallet, env.networkId, seed);
    }

    return new NovaWalletProvider(
      logger,
      wallet,
      ZswapSecretKeys.fromSeed(seeds.shielded),
      DustSecretKey.fromSeed(seeds.dust),
      keystore,
    );
  }
}

/** Resolves once the unshielded balance for `tokenRaw` is > 0 (or rejects on timeout). */
export function waitForUnshieldedBalance(
  wallet: WalletFacade,
  tokenRaw: string,
  timeoutMs = 20_000,
): Promise<bigint> {
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(2_000),
      Rx.filter((state) => isSynced(state) && ((state.unshielded.balances[tokenRaw] as bigint | undefined) ?? 0n) > 0n),
      Rx.map((state) => (state.unshielded.balances[tokenRaw] as bigint | undefined) ?? 0n),
      Rx.timeout({ each: timeoutMs }),
    ),
  );
}
