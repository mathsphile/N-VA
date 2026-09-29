# N-VA — Audit Record

Two review passes over the contract, the app and the deployment tooling, plus findings from real
preprod/preview runs. Findings are split into **applied** (a change exists, with a commit) and
**open** (documented, not fixed). Nothing here is softened: a risk we did not remove is listed as a
risk we did not remove.

## Applied

| Area | Finding | Change |
|---|---|---|
| Deploy | Transaction submission could hang forever on a dropped or invalid tx | Bounded finalisation (`TX_FINALIZE_TIMEOUT_MS`); `Dropped`/`Invalid` rejected explicitly. `db20b8c` |
| Deploy | No visibility into where a deploy spent time | Eight numbered stages with per-stage timings. `db20b8c` |
| Deploy | Witness material could be sent to a remote proof server | Deploy aborts unless `PROOF_SERVER_URL` is loopback. `db20b8c` |
| Deploy | A crash after publish could produce a second contract | Publishes-once guard `.deploy/pending-<network>.json`; a re-run resumes at initialize. |
| Sync | Every run replayed ~1.57M dust events from genesis because the v4 indexer dropped `block.transactions.dustLedgerEvents` | SDK `serialize()`/`restore()` checkpoints + resumable chunked sync. `8e0bb78`, `0f89b92` |
| Sync | Persisting the load-time cursor bump silently skipped one real event per resume; ~26 skips desynced the WASM dust tree | Restored processes no longer persist their own bump; honest `applied=` progress. `c5693f3`, `90e6208` |
| Sync | Two processes writing one checkpoint file | Per-network single-writer lock; a lock miss aborts rather than falling back to a 5-hour replay. |
| Sync | No way to repair a drifted cursor except by hand | `npm run deploy:heal` uses the WASM expected/received leaf numbers as an oracle and iterates. `e09f79f` |
| Sync | Unshielded completion predicate unsatisfiable once `appliedId` passed a frozen `highestTransactionId` | Connected cursor at/above the served cap treated as complete. `8c59844` |
| API | `/api/ledger/state` opened an indexer subscription per request | Cached reads with a hard timeout. `7c66daf` |
| Client vault | Unhandled throws in vault paths; unsafe `localStorage` parse | Guarded throws; parse-and-fall-back on corrupt storage. |
| Data honesty | Dead `readPublicState` path; fake `attestedBy` attribution to a contract that was not involved | Removed; labels now state what actually attested. |
| Hygiene | Demo seed served from `public/` | Moved to `docs/tools/` so a fixture cannot be served by the deployed app. |
| Hygiene | Secrets in logs; key material in the working tree | No seed material logged (fingerprint prefix only); checkpoints mode `0600` in a `0700` dir; `.gitignore` committed before source. Verified pre-push: no secret paths in the tree, no seed value in any committed file. |
| Dependencies | Implicit dev-only deps for the deploy path; wallet/SDK versions unpinned | Promoted and pinned in `package.json` + lockfile. |
| Dependencies | Two copies of `onchain-runtime-v3` (3.1.1 for the contract, 3.0.0 for the SDK) → `expected instance of StateValue` | `overrides` pin + dedupe to one hoisted 3.0.0. Pending a successful `initialize` to close. |

## Open

| Risk | Severity | What it means today |
|---|---|---|
| **No on-chain uniqueness enforcement** | High (product claim) | The contract holds no nullifier set. Uniqueness is an off-chain registry policy checked per proof, so the same holder can be issued more than once if the issuer does not stop them. Documentation must never claim "one person, one claim" is enforced. |
| **`initialize` is front-runnable** | High | The bootstrap transition is not gated to the operator key. Anyone reaching the published contract first can set initial state. Needs a contract-side authorisation change. |
| **Holder entropy reuse in scripts** | Medium | One seed derives multiple roles. Acceptable for a testnet deployer, wrong for production custody — a real deployment needs per-role independent keys. |
| **Browser vault is obfuscation** | Medium | Passphrase-gated `localStorage`. It deters casual reading on a shared device; it is not custody, and the UI must keep saying so. |
| **`npm audit`: postcss (high, XSS via unescaped `</style>` in stringify output) pulled in by `next` (moderate)** | Medium | Not fixed — resolving it needs a Next.js/Tailwind toolchain bump, which is a breaking change and was not authorised. Report-only. |
| **Nothing has been proven on-chain yet** | Blocks validation claims | Both contracts are `BOOTSTRAPPING` with `credentialCount 0`, `proofCount 0` and no indexed operations, so there is no end-to-end credential → proof → verify evidence yet. |

## What a reviewer can check right now

- Contract state, decoded from the indexer rather than from our own deploy record:
  `npm run deploy:verify preprod <address>` → `status: BOOTSTRAPPING`, counters `0`, empty accumulator.
- Explorer: [preprod contract](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada),
  publish tx [`06fd574d…`](https://preprod.midnightexplorer.com/tx/06fd574d6c8e23e20606130a2a579b3e171d72272e23625fb9da3c1799ff8ade).
- Every applied finding above has a commit hash from `git log` in this repository.
