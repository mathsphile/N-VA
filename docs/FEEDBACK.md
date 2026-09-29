# N-VA — Feedback Documentation

What we heard, what changed because of it, and what is still open. Every "changed" row points at a
commit that can be opened; every "not changed" row says so.

Sources, in the order they produced work:

1. **Code and protocol audit** — two independent review passes over the contract, the app and the
   deploy scripts. Record: [AUDIT.md](AUDIT.md).
2. **Runtime failures during real preprod/preview deploys** — measured, not reported second-hand.
3. **The user feedback form** — 58 responses, exported and checked in
   [../USERS.md](../USERS.md).

---

## What We Heard → What We Changed

| # | Heard | Changed | Evidence |
|---|---|---|---|
| 1 | "Deploys take unusually long." | Found the cause: the v4 indexer dropped `block.transactions.dustLedgerEvents`, so the snapshot fast-path always threw and **every run replayed ~1.57M dust events from genesis**. Replaced it with SDK `serialize()`/`restore()` wallet checkpoints and a resume path. | `8e0bb78` |
| 2 | "A single sync process dies mid-run." | One process retains ~40KB per event and hits the V8 heap ceiling (~6.6GB observed). Sync now runs in heap-bounded, time-bounded chunks under a supervisor that trusts **cursor progress, not exit codes**, and aborts on a detected stall. | `0f89b92` |
| 3 | "The sync looked alive for hours while going nowhere." | Root cause: the load-time cursor bump was being persisted, so every resume silently skipped one real event (~26 skipped before the WASM dust tree refused to resume at all). Restored processes no longer persist their own bump, and probe progress is measured without it. | `c5693f3`, `90e6208` |
| 4 | "Two runs corrupted one checkpoint." | Two supervisors replaying the same seed each wrote their own cursor into the same file. One process now holds a per-network checkpoint lock, and a lock miss **aborts loudly instead of silently falling back to a 5-hour genesis replay**. | `8e0bb78` |
| 5 | "When the tree does desync, recovery is manual guesswork." | The WASM abort message states the leaf it expects and the leaf it was fed — an exact oracle. `npm run deploy:heal` rewinds or advances the stored cursor by that difference and re-probes read-only until the resume applies cleanly. Converged preprod in 3 tries: `1573008 → 1572982 → 1572980`, then **2,124 events applied with no abort**. | `e09f79f` |
| 6 | "The wallet never reports synced, even at the tip." | The SDK predicate demands `|highestTransactionId − appliedId| === 0`; on preprod that cap froze at tx `569484` while the stored cursor rose to `569512`, so it was unsatisfiable. A connected cursor at or above the served cap is now treated as complete — deliberately *not* by clamping the cursor back, which would re-serve ~28 applied transactions. | `8c59844` |
| 7 | "Submissions hang and the deploy gives no timings." | Bounded transaction finalisation (`TX_FINALIZE_TIMEOUT_MS`, rejects `Dropped`/`Invalid`), a publishes-once guard so a crash cannot double-deploy, and eight numbered stages with per-stage timings. Measured on the first preprod publish: sync **42.8s**, dust readiness **1850.1s**, submit **20.0s**. | `db20b8c` |
| 8 | "The proof server could take witness material off this machine." | The deploy script asserts the proof-server URL is loopback and exits otherwise; a health check gates `[3/8]`. | `db20b8c` |
| 9 | "`/api/ledger/state` opened an indexer subscription per request." | Cached reads with a hard timeout, so an unreachable indexer degrades to standby instead of leaking sockets. | `7c66daf` |
| 10 | "Docs claimed privacy properties the contract does not enforce." | The contract has **no nullifier set**, so "one person, one claim" is an off-chain registry policy. That claim was removed; the limits are now stated in the README privacy model and carried in the audit record. | [README.md](../README.md), [AUDIT.md](AUDIT.md) |
| 11 | "Fake attribution in demo data." | `attestedBy` and labels no longer credit a contract that was not involved; the demo seed moved out of `public/` so a fixture can never be served by the deployed app. | `f3e7432`, docs(tools) commit |
| 12 | "Preview `initialize` failed with an empty object." | Failures that arrive as non-`Error` values are now dumped structurally (`dumpError`, `where`/`message`/`detail`) rather than printing `{}`. The preprod run of the same path produced the actionable `expected instance of StateValue`, which is what identified the WASM runtime split below. | `af27e60` |
| 13 | "`initialize` aborts with `expected instance of StateValue`." | Cause: `midnight-js-protocol@4.1.1` pins `onchain-runtime-v3@3.0.0` exactly while `compact-runtime@0.16.0` floats `^3.0.0` to **3.1.1** — two WASM instances, so the contract built state with one copy's class and the SDK's `_assertClass` tested against the other. Pinned down to a single hoisted 3.0.0 copy via `overrides` + dedupe. | `package.json`, lockfile (in review) |
| 14 | "Secret material sits in local files." | `.gitignore` landed **before** any source commit; checkpoints, `.env*`, `midnight-level-db/`, `.deploy/` and `logs/` are ignored, cache files are mode `0600` in a `0700` directory, and no seed material is logged. Verified before pushing: no secret paths in the tree and no seed value present in any committed file. | first commit |

## Feedback from the form — honest status

The 58 collected responses ask for gas-fee estimate accuracy, Polygon and L2 support, WalletConnect
stability, ENS resolution, staking, NFTs, fiat on-ramps, hardware wallets, multi-sig, cross-chain
bridging, CSV export, iOS widgets, a light theme and regional-language translation. **None of these
describe N-VA**, which is a Midnight ZK credential dApp with no gas estimator, no multi-chain
routing and no token balances. They are published verbatim in
[../USERS.md](../USERS.md) and are **not** counted as N-VA product feedback or preprod usage.

Three of them do map onto real UX surface, with this status:

| Theme | In N-VA | Status |
|---|---|---|
| Dark/light theme | single dark theme, no toggle, no `prefers-color-scheme` handling | **not implemented** |
| Mobile load and type size | responsive breakpoints exist (`sm:`/`lg:` across the app), viewport configured; no i18n | **partly** |
| Accessibility of motion | `prefers-reduced-motion` honoured in the landing scene and reveal wrapper | **done** |

## Heard, Not Changed (open)

- **`initialize` is front-runnable** — the bootstrap transition is not gated to the operator. Needs
  a contract-side authorisation check, not a script change.
- **Holder entropy reuse in the scripts** — the deploy path derives from one seed for multiple roles;
  fine for a testnet deployer, wrong for production custody.
- **`localStorage` vault is obfuscation** — passphrase-gated, not server-side-safe.
- **The runtime pin is not yet proven end-to-end** — `initialize` has to clear before this row closes.
- **No CI** — there is no workflow file. The app is deployed to
  [Vercel](https://nova-git-main-nandini-das-projects.vercel.app/) from `main`, but Deployment
  Protection still redirects anonymous visitors to `vercel.com/sso-api`, so it is not demo-able
  yet — `vercel.json` and `.nvmrc` were added to make the build reproducible and
  [README → Hosting](../README.md#hosting-vercel) documents the dashboard settings it needs.
- **Screenshots exist but are un-reviewed** — six headless captures (desktop + mobile) are committed
  under `docs/screenshots/` and were checked only for distinctness and size; no human has viewed
  them, and they show simulation mode, not the hosted ledger build.

## Cycle

Form → measured export → checks in `USERS.md` → findings in `AUDIT.md` → change with a commit hash
in the table above. Where a row has no hash, it is not claimed as done.
