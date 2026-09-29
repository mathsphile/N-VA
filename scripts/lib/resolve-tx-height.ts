/*
 * NØVA — resolve a transaction's real block height from the v4 indexer.
 *
 * The checkpoint-restored facade submits through the node's
 * midnight.sendMnTransaction extrinsic, whose finalization event does not
 * carry a block height (SDK limitation on this path). The indexer does, via
 * `transactions(offset: <height>)`. A tx finalizes within a handful of
 * blocks of the tip observed at submission time, so a bounded forward scan
 * from that tip is both correct and cheap. Read-only; never a tight loop —
 * fixed step interval, hard probe cap, undefined result when unconfirmed.
 */

import axios from 'axios';

const normalize = (h: string): string => h.replace(/^0x/, '').toLowerCase();

export async function resolveTxHeight(
  indexerUrl: string,
  txHash: string,
  lowHeight: number,
  maxBlocks = 60,
  stepDelayMs = 2_000,
): Promise<{ height: number } | undefined> {
  const needle = normalize(txHash);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let height = Math.max(1, lowHeight - 1); height <= lowHeight + maxBlocks; height += 1) {
    try {
      const res = await axios.post(
        indexerUrl,
        { query: `{ transactions(offset: ${height}) { hash } }` },
        { timeout: 10_000 },
      );
      const txs: { hash?: string }[] = res.data?.data?.transactions ?? [];
      if (txs.some((t) => normalize(t.hash ?? '') === needle)) return { height };
      // Empty slot ahead of the chain tip — wait a beat for production.
      await sleep(txs.length === 0 ? stepDelayMs : 150);
    } catch {
      await sleep(stepDelayMs);
    }
  }
  return undefined;
}
