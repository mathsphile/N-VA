#!/usr/bin/env bash
# NØVA — resumable Preprod/Preview deployment supervisor.
#
# Runs bounded sync chunks until the deploy wallet is fully synced. Progress,
# not exit codes, is the source of truth: the checkpoint cursor sidecar
# (.wallet-cache/LATEST-<network>.cursor) must advance by >= PROGRESS_MIN
# events per chunk, no matter how the chunk ended (clean watermark exit,
# OOM kill, WS hiccup). Two stagnant chunks in a row = stall -> abort with a
# clear message instead of looping blindly. deploy-ledger.ts itself resumes
# an already-published contract (.deploy/pending-<network>.json), so a crash
# at any point never produces a duplicate deployment.
#
#   scripts/supervise-deploy.sh [preview|preprod] [max-chunks]
#
# Tunables (env): SYNC_CHUNK_MAX_MS, SYNC_HEAP_LIMIT_MB, CHECKPOINT_EVERY_MS,
# FUNDS_WAIT_MS, CALL_TX_TIMEOUT_MS, TX_FINALIZE_TIMEOUT_MS, PROGRESS_MIN
set -u

NETWORK="${1:-preprod}"
MAX_CHUNKS="${2:-60}"
PROGRESS_MIN="${PROGRESS_MIN:-1}"   # at the live chain tip, any cursor movement proves liveness
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=6500}"
cd "$(dirname "$0")/.."

CURSOR_FILE=".wallet-cache/LATEST-${NETWORK}.cursor"
read_cur() { cat "$CURSOR_FILE" 2>/dev/null || echo 0; }

stall=0
i=1
synced=0
while [ "$i" -le "$MAX_CHUNKS" ]; do
  before=$(read_cur)
  echo "=== sync chunk $i/$MAX_CHUNKS (network: $NETWORK, cursor: $before) ==="
  npx tsx scripts/sync-chunks.ts "$NETWORK"
  code=$?
  after=$(read_cur)
  if [ "$code" -eq 0 ]; then
    synced=1
    echo "=== wallet fully synced after chunk $i — deploying ==="
    break
  fi
  prog=$((after - before))
  if [ "$prog" -ge "$PROGRESS_MIN" ]; then
    stall=0
    echo "=== chunk $i ended (exit $code) but cursor advanced +$prog — continuing ==="
  else
    stall=$((stall + 1))
    echo "=== chunk $i ended (exit $code) with cursor +$prog (<$PROGRESS_MIN) — stall $stall/2 ==="
    if [ "$stall" -ge 2 ]; then
      echo "!!! sync stalled twice in a row — aborting (no blind loop). Inspect indexer connectivity / checkpoint."
      exit 1
    fi
  fi
  i=$((i + 1))
  sleep 5
done

if [ "$synced" -ne 1 ]; then
  echo "!!! sync did not complete within $MAX_CHUNKS chunks — aborting"
  exit 1
fi

npm run deploy:ledger "$NETWORK"
