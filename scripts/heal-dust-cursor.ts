/*
 * NØVA — dust checkpoint calibration.
 *
 * A resumed dust wallet either aborts with
 *   "values inserted non-linearly into dust commitment tree; expected to
 *    insert index E, but received R"
 * or it doesn't. That abort message is an exact oracle: the serialized tree
 * is at leaf E while the cursor we restored points at the event that would
 * insert leaf R. In this region of the ledger dust events map 1:1 to tree
 * inserts, so rewinding the stored cursor by (R - E) lands the resume on the
 * event the tree is actually waiting for.
 *
 * The driver therefore runs read-only probe chunks (CHECKPOINT_WRITE=0 so the
 * checkpoint never moves underneath us), reads the mismatch out of the probe's
 * own output, rewrites the cursor, and repeats until the probe applies events
 * cleanly. Preprod needed this after ~26 phantom cursor advances desynced the
 * tree; without it every chunk died on the first batch.
 *
 *   npx tsx scripts/heal-dust-cursor.ts [preview|preprod] [max-tries]
 *
 * Exit codes: 0 = resume is clean (safe to run the supervisor), 1 = cannot
 * attribute the failure, 2 = oscillated/stalled without converging.
 */

import { spawnSync } from 'node:child_process';
import { pino } from 'pino';
import { checkpointDustIndex, setCheckpointOffset } from './lib/wallet-provider.js';
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

interface Probe {
  out: string;
  status: number | null;
}

function runProbe(): Probe {
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

const DUST_MISMATCH = /expected to insert index (\d+), but received (\d+)/;
const RESULT = /chunk result: reason=\S+ applied=(\d+) cursor=\d+/;
const otherApplyError = (out: string): boolean =>
  /Error while applying sync update/.test(out) && !DUST_MISMATCH.test(out);

const seen = new Set<string>();
let stagnant = 0;

for (let attempt = 1; attempt <= maxTries; attempt += 1) {
  const cursor = checkpointDustIndex(network, seed);
  logger.info(`try ${attempt}/${maxTries}: probing resume from dust cursor ${cursor} (${Math.round(probeMs / 1000)}s, read-only)…`);
  const { out, status } = runProbe();

  if (/Wallet fully synced/.test(out)) {
    logger.info('Wallet reports fully synced — checkpoint is healthy.');
    process.exit(0);
  }

  const mismatch = DUST_MISMATCH.exec(out);
  if (mismatch) {
    const [, expectedText = '0', receivedText = '0'] = mismatch;
    const expected = BigInt(expectedText);
    const received = BigInt(receivedText);
    const next = cursor - (received - expected);
    if (next < 0n) {
      logger.error(`calibration would rewind past genesis (cursor ${cursor}, delta ${received - expected}) — checkpoint state is unrecoverable.`);
      process.exit(1);
    }
    const key = `${cursor}->${next}`;
    if (seen.has(key)) {
      logger.error(`calibration oscillated at ${key} — stopping rather than looping.`);
      process.exit(2);
    }
    seen.add(key);
    logger.info(
      `tree at leaf ${expected}, cursor feeds leaf ${received}: rewinding dust cursor ${cursor} → ${next}.`,
    );
    setCheckpointOffset(network, seed, 'dust', next);
    continue;
  }

  if (otherApplyError(out)) {
    logger.error('a non-dust stream failed to apply; this driver only calibrates dust. Capture the cause before resuming:');
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
  logger.warn(`probe ${attempt}: no events applied and no mismatch (status ${status}) — dust stream idle? [${stagnant}/2]`);
  if (stagnant >= 2) {
    logger.error('stalled twice with no mismatch to act on — the block is not the cursor. Check indexer WS connectivity before looping.');
    process.exit(2);
  }
}

logger.error(`no convergence after ${maxTries} probes.`);
process.exit(2);
