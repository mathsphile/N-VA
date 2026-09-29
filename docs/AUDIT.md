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
| Dependencies | Two copies of `onchain-runtime-v3` (3.1.1 for the contract, 3.0.0 for the SDK) → `expected instance of StateValue` | `overrides` pin + dedupe to one hoisted 3.0.0. **Closed and proven:** the next run submitted `initialize` and the registry went `LIVE`. |
| Deploy | The fee gate waited on `wallet.waitForSyncedState()`, whose unshielded predicate cannot resolve once the cursor sits above a frozen cap. It timed out after 1850s, logged `proceeding cautiously`, and submitted a transaction built on a zswap tree that had aborted an event — the node answered `Invalid Transaction: Custom error: 170` | Missing sync is now **fatal**, not a warning; progress is polled against our own predicate; the calibration driver repairs the **shielded** cursor as well as dust; the resume branch binds the contract address to private state. |
| Tooling / docs | Explorer transaction links were dead: `preprod.midnightexplorer.com` serves only `/address/<addr>` — `/transaction/`, `/tx/`, `/block/` and `/extrinsic/` all return 404 (probed) | `verify-deployment.ts` prints the tx hash against the contract page instead of emitting a 404 URL; README links only paths that resolve. |
| CI | No pipeline existed, so "tests pass inside 5 minutes" was unverifiable | `.github/workflows/ci.yml`: `npm ci` → lint → typecheck → test → build → assert the deployed registry is `LIVE`, with `timeout-minutes: 5` enforcing the budget. The same gate measures 35.0s locally. |

## Open

| Risk | Severity | What it means today |
|---|---|---|
| **No on-chain uniqueness enforcement** | High (product claim) | The contract holds no nullifier set. Uniqueness is an off-chain registry policy checked per proof, so the same holder can be issued more than once if the issuer does not stop them. Documentation must never claim "one person, one claim" is enforced. |
| **`initialize` is front-runnable** | High | The bootstrap transition is not gated to the operator key. The operator won it first on preprod, but the gap is a design risk for every future publish, not a closed finding. |
| **Preview registry is not live** | Medium | `9b11813f…` is published but still `BOOTSTRAPPING`; `initialize` was never re-attempted there after the runtime pin. Only preprod carries a live registry. |
| **Publish tx block height unresolved** | Low (evidence quality) | The indexer scan returned no height, so `.deploy/preprod.json` records `pending-indexer`. No number was invented for it. |
| **Test coverage is 2 tests** | Medium | Circuit metadata and bindings only. The policy parser, credential commitment path, proof engine and UI have no automated coverage. |
| **Holder entropy reuse in scripts** | Medium | One seed derives multiple roles. Acceptable for a testnet deployer, wrong for production custody — a real deployment needs per-role independent keys. |
| **Browser vault is obfuscation** | Medium | Passphrase-gated `localStorage`. It deters casual reading on a shared device; it is not custody, and the UI must keep saying so. |
| **`npm audit`: postcss (high, XSS via unescaped `</style>` in stringify output) pulled in by `next` (moderate)** | Medium | Not fixed — resolving it needs a Next.js/Tailwind toolchain bump, which is a breaking change and was not authorised. Report-only. |
| **Live dApp is not anonymously reachable** | High (demo) | Vercel Deployment Protection redirects to `vercel.com/sso-api`; until it is switched off, a reviewer cannot open the hosted app. |

## What a reviewer can check right now

- Contract state, decoded from the indexer rather than from our own deploy record:
  `npm run deploy:verify preprod <address>` → `status: LIVE`, `credentialCount 1`, `proofCount 1`,
  accumulator `5af062a25d662922d827ca02…`, attestation `6493674cda0f90fd16fa924b…`, scope
  `nova:test:hackspire-grant`.
- Explorer (only `/address/<addr>` resolves): [preprod contract](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada) —
  publish `06fd574d6c8e23e20606130a2a579b3e171d72272e23625fb9da3c1799ff8ade`, initialize
  `91caece98fa1e8f31c576c423ea847b37cb65869b7ea682161d0001ade5e40b9` (block `c1ec562c…`),
  registerCredential `c13a38994debaa94aefb0d277abaea0d5908654b79acc57732c884f6dd0a4d17`, attest
  `ab212a78266fba46653473ede1d2de7885250f90dadd52c7de6affc2452a2d68`.
- Every applied finding above has a commit hash from `git log` in this repository.
