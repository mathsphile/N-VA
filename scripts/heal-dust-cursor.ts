/*
 * NØVA — checkpoint cursor calibration.
 *
 * A resumed wallet either aborts with
 *   "values inserted non-linearly into <tree>; expected to insert index E,
 *    but received R"
 * or it doesn't. That abort is an exact oracle: the serialized tree sits at
 * leaf E while the cursor we restored feeds the event that would insert leaf
 * R, and in these regions of the ledger events map 1:1 to tree inserts. So
 * moving the stored cursor by (R - E) lands the resume on the event the tree
 * is actually waiting for — negative delta rewinds (events were skipped),
 * positive delta advances (an event was re-fed).
 *
 * Three trees report this, and they belong to two different sub-wallets, so
 * both are calibrated here:
 *   dust commitment tree / dust generation tree  -> dust wallet cursor
 *   zswap commitment tree                        -> shielded wallet cursor
 *
 * The driver runs read-only probe chunks (CHECKPOINT_WRITE=0, so the
 * checkpoint never moves underneath it), reads the mismatch out of the probe's
 * own output, rewrites the cursor, and repeats until a probe applies events
 * with no abort. Preprod needed this twice: ~26 skipped dust events after
 * phantom cursor advances, then a shielded cursor one *behind* its tree after
 * a write-side un-bump window.
 *
 *   npx tsx scripts/heal-dust-cursor.ts [preview|preprod] [max-tries]
 *
 * Exit codes: 0 = resume is clean (safe to deploy), 1 = failure cannot be
 * attributed to a cursor, 2 = oscillated or stalled without converging.
 */

import { spawnSync } from 'node:child_process';
import { pino } from 'pino';
import { checkpointCursor, setCheckpointOffset } from './lib/wallet-provider.js';
import { loadEnvFiles } from './lib/env.js';

const logger = pino({ level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } });

const network = (process.argv[2] ?? 'preprod') as 'preprod' | 'preview';
const maxTries = Number(process.argv[3] ?? 8);
const probeMs = Number(process.env.HEAL_PROBE_MS ?? 90_000);

loadEnvFiles();

function requireSeed(): string {
  const value = process.env[`MIDNIGHT_${network.toUpperCase()}_SEED`] ?? process.env.MIDNIGHT_WALLET_SEED;
  if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`MIDNIGHT_${network.toUpperCase()}_SEED (64-hex) is required in .env.local.`);
  }
  return value;
}

const seed = requireSeed();

function runProbe(): { out: string; status: number | null } {
  const result = spawnSync('npx', ['tsx', 'scripts/sync-chunks.ts', network], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      CHECKPOINT_WRITE: '0',
      CHECKPOINT_LOCK: '0', // this driver owns the file; probes must not fight over it
      SYNC_CHUNK_MAX_MS: String(probeMs),
      SYNC_HEAP_LIMIT_MB: process.env.SYNC_HEAP_LIMIT_MB ?? '5000',
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=6500',
    },
  });
  return { out: `${result.stdout ?? ''}${result.stderr ?? ''}`, status: result.status };
}

const streamFor = (tree: string): 'dust' | 'shielded' => (tree === 'zswap commitment tree' ? 'shielded' : 'dust');

function mismatches(out: string): Array<{ stream: 'dust' | 'shielded'; tree: string; expected: bigint; received: bigint }> {
  const found: Array<{ stream: 'dust' | 'shielded'; tree: string; expected: bigint; received: bigint }> = [];
  for (const tree of ['dust commitment tree', 'dust generation tree', 'zswap commitment tree']) {
    // Sticky per-tree scan: the same tree can be reported several times in one
    // chunk as the SDK retries the batch it failed on.
    const re = new RegExp(
      `values inserted non-linearly into ${tree}; expected to insert index (\\d+), but received (\\d+)`,
    );
    const m = re.exec(out);
    if (m) {
      const [, expectedText = '0', receivedText = '0'] = m;
      found.push({ stream: streamFor(tree), tree, expected: BigInt(expectedText), received: BigInt(receivedText) });
    }
  }
  return found;
}

const RESULT = /chunk result: reason=\S+ applied=(\d+) cursor=\d+/;

const seen = new Set<string>();
let stagnant = 0;

for (let attempt = 1; attempt <= maxTries; attempt += 1) {
  const dustCursor = checkpointCursor(network, seed, 'dust');
  const shieldedCursor = checkpointCursor(network, seed, 'shielded');
  logger.info(
    `try ${attempt}/${maxTries}: probing resume from dust ${dustCursor} / shielded ${shieldedCursor} (${Math.round(probeMs / 1000)}s, read-only)…`,
  );
  const { out, status } = runProbe();

  if (/Wallet fully synced/.test(out)) {
    logger.info('Wallet reports fully synced — checkpoint is healthy.');
    process.exit(0);
  }

  const found = mismatches(out);
  if (found.length > 0) {
    for (const f of found) {
      const cursor = f.stream === 'dust' ? dustCursor : shieldedCursor;
      const next = cursor - (f.received - f.expected);
      if (next < 0n) {
        logger.error(`calibration would rewind ${f.stream} past genesis (cursor ${cursor}, delta ${f.received - f.expected}) — checkpoint state is unrecoverable.`);
        process.exit(1);
      }
      const key = `${f.stream}:${cursor}->${next}`;
      if (seen.has(key)) {
        logger.error(`calibration oscillated at ${key} — stopping rather than looping.`);
        process.exit(2);
      }
      seen.add(key);
      logger.info(
        `${f.tree}: tree at leaf ${f.expected}, cursor feeds leaf ${f.received} → ${f.stream} cursor ${cursor} → ${next}.`,
      );
      setCheckpointOffset(network, seed, f.stream, next);
    }
    continue;
  }

  if (/Error while applying sync update/.test(out)) {
    logger.error('an apply failure that no cursor delta can explain. Captured cause:');
    logger.error(out.split('\n').filter((l) => /Error|error|cause/.test(l)).slice(0, 12).join('\n'));
    process.exit(1);
  }

  const result = RESULT.exec(out);
  const [, appliedText = '0'] = result ?? [];
  if (result && BigInt(appliedText) > 0n) {
    logger.info(`resume applied ${appliedText} events with no tree abort — checkpoint healed.`);
    process.exit(0);
  }

  stagnant += 1;
  logger.warn(`probe ${attempt}: no events applied and no mismatch to act on (status ${status}) — indexer stream idle? [${stagnant}/2]`);
  if (stagnant >= 2) {
    logger.error('stalled twice with nothing to recalibrate — the blocker is connectivity, not the cursor.');
    process.exit(2);
  }
}

logger.error(`no convergence after ${maxTries} probes.`);
process.exit(2);
