# N-VA — Usage Guide

Two distinct paths: **using the dApp** (browser, your own wallet) and **operating a deployment**
(server-side, needs the proof server and a funded seed).

## Requirements

| For | You need |
|---|---|
| UI | Node `>=22 <26` (`package.json` engines), npm |
| Real ledger state | Midnight **Lace** or **1AM Wallet** extension, connected to preprod or preview |
| Deploy / proving | Docker running the loopback proof server, tNIGHT on the deployer |

```bash
npm install
cp .env.example .env.local
```

`.env.local` keys that matter: `NEXT_PUBLIC_MIDNIGHT_MODE` (`simulation` or `ledger`),
`NEXT_PUBLIC_MIDNIGHT_NETWORK_ID`, `NEXT_PUBLIC_MIDNIGHT_CONTRACT_ID`, and the server-only
`MIDNIGHT_WALLET_SEED` / `MIDNIGHT_PREPROD_SEED` / `MIDNIGHT_PREVIEW_SEED`. The `NEXT_PUBLIC_*`
values ship to the browser; **never put a seed in one**.

## Run the app

```bash
npm run dev            # http://localhost:3000
```

- **Simulation mode** (default) proves against the local engine — useful for the flow, and the
  header shows a mode badge so it is never mistaken for ledger-bound.
- **Ledger mode** needs the contract id in `.env.local`; the dashboard then reads live state from
  the indexer over GraphQL/WebSocket.

Verify before shipping:

```bash
npm run lint && npm run typecheck && npm test
```

## Using it

1. Connect wallet (Navbar → Connect). No provider installed → the app says so; it does not invent an
   address.
2. `/dashboard/credentials` — view the holder's credential vault.
3. `/dashboard/requests` — a verifier policy request arrives here; open it to see exactly which
   predicates are being disclosed before approving.
4. `/dashboard/proofs` — run the proof. Each circuit stage is reported as it happens; a stuck or
   failed proof surfaces as failed, not as a spinner forever.
5. `/dashboard/reputation`, `/dashboard/activity` — counters and events read back from the chain.
6. `/verify/<id>` — share this with anyone; verification needs no account.
7. `/developers` and `/grant` — integration snippets and the grant-application flow.

## Operating a deployment

Proof server first — it receives witness material, so keep it on loopback (the deploy script
refuses a non-loopback URL):

```bash
docker run -d --rm -p 127.0.0.1:6300:6300 midnightntwrk/proof-server:8.1.0
curl -s localhost:6300/health        # {"status":"ok",...}
```

Generate a throwaway deploy seed (prints only the address) and fund it from the
[preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/):

```bash
npm run wallet:init preprod
npm run wallet:check preprod         # funded / synced / fee-ready
```

Then deploy. The first run on a network replays ~1.57M dust events from genesis in heap-bounded
chunks, so give it hours once; later runs resume from the checkpoint in about a minute.

```bash
npm run deploy:supervised preprod    # chunked sync to the tip, then publish + initialize + tests
npm run deploy:verify preprod <contract address>
```

Stages printed by `deploy:ledger`, with timings, from the 2026-09-30 preprod run:

```
[1/8] Environment            [5/8] DUST readiness (register + grace)
[2/8] ZK artifacts           [6/8] Submit deployment tx     → published
[3/8] Proof server health    [7/8] Initialize + test circuits
[4/8] Wallet connect + sync  [8/8] Record deployment
```

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Sync stuck at the same `appliedIndex` across chunks, log repeats `values inserted non-linearly` | Checkpoint cursor drifted from the commitment tree. `npm run deploy:heal preprod` rewinds/advances it using the WASM's own expected-vs-received numbers, then re-run the supervisor. |
| "checkpoint for preprod is held by pid N" | Another sync/deploy process owns the file. Stop it — running two against one checkpoint is what caused the drift. |
| Wallet never reports fully synced though the tip is reached | Historically the unshielded predicate; now handled. If it recurs, check `appliedId` against `highestTransactionId` in the chunk log. |
| `expected instance of StateValue` | Two copies of `onchain-runtime-v3`. `npm ls @midnight-ntwrk/onchain-runtime-v3` must show **one** copy; `package.json` overrides pin it to the version `midnight-js-protocol` requires. |
| Publish succeeds, then the run dies | Safe to re-run: `.deploy/pending-<network>.json` prevents a second publish and the run resumes at initialize. |
| Proof server unreachable / non-loopback | Start the container; the script aborts rather than sending witnesses elsewhere. |
| Dust fees insufficient mid-deploy | `ensureDustReady` waits a bounded grace window and reports the real balance; it does not fake a ready state. |
