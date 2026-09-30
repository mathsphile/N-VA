# NOVA — Private Proof Network

Prove eligibility and reputation without surrendering the data behind it.
  
**[Live dApp →](https://nova-git-main-nandini-das-projects.vercel.app/)** ·
**[Demo video →](https://youtu.be/XoNDS-X3bCk)** ·
**[X @nightnovapp →](https://x.com/nightnovapp)** ·
[Preprod contract →](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada) ·
[Proposal](PROPOSAL.md) · [Usage](docs/USAGE.md)

![CI](https://github.com/mathsphile/N-VA/actions/workflows/ci.yml/badge.svg)

Apache-2.0 · Midnight · Rise In — *New Moon to Full* (target: **Level 5, Full Moon**)

> **The preprod registry is `LIVE`.** Publish, `initialize`, `registerCredential` and `attest` have
> all executed on-chain — [`02f0cde4…`](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada)
> reads back from the indexer as `credentialCount 1`, `proofCount 1`.
> The live URL is still behind Vercel **Deployment Protection** — an anonymous visitor gets a
> `302` to `vercel.com/sso-api`, not the app. See
> [Hosting](#hosting-vercel) for the one toggle that opens it, and
> [Status](#status) for exactly what is verified and what is still outstanding.

---

## Contents

- [Overview](#overview)
- [Live Demo and Quick Links](#live-demo-and-quick-links)
- [Privacy Model](#privacy-model)
- [How It Works](#how-it-works)
- [Protocol Feedback Loop](#protocol-feedback-loop)
- [On-Chain Deployment](#on-chain-deployment)
- [User Validation](#user-validation-level-5)
- [Feedback Documentation](#feedback-documentation)
- [Diagrams](#diagrams)
- [App Screenshots](#app-screenshots)
- [App Surface](#app-surface)
- [App Architecture](#app-architecture)
- [Quick Start](#quick-start)
- [Hosting (Vercel)](#hosting-vercel)
- [Continuous integration](#continuous-integration)
- [Scripts](#scripts)
- [Status](#status)

---

## Overview

N-VA is a selective-disclosure credential dApp on Midnight. A registry issues credential
commitments to a holder's browser; the holder then proves *predicates* of those credentials —
age band, region, enrollment, membership — for a verifier's scope, without the issuer, the
verifier or the ledger ever receiving the underlying attribute.

The ledger holds one running digest over all registered commitments plus two aggregate counters.
It never holds a name, a date of birth, a location or a holder identifier. The verifier receives
a boolean result, a proof attestation and the scope it asked about.

**Core principle: verify the claim, not the data.**

---

## Live Demo and Quick Links

| Resource | Link | Notes |
|---|---|---|
| Live dApp | [nova-git-main-nandini-das-projects.vercel.app](https://nova-git-main-nandini-das-projects.vercel.app/) | Vercel, `main` branch. **Currently behind Vercel Authentication** — see [Hosting](#hosting-vercel) |
| Demo walkthrough | [youtu.be/XoNDS-X3bCk](https://youtu.be/XoNDS-X3bCk) | project walkthrough video |
| Preprod contract | [`02f0cde4…`](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada) | **`LIVE`** — 1 credential, 1 proof indexed ([state](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada)) |
| Initialize transaction | `91caece98fa1e8f31c576c423ea847b37cb65869b7ea682161d0001ade5e40b9` | bootstrapped the registry into `LIVE` — see the contract page |
| X (project account) | [@nightnovapp](https://x.com/nightnovapp) | updates and announcements |
| Preview contract | [`9b11813f…`](https://preview.midnightexplorer.com/address/9b11813f66286fd2806517a0e076ca19898ceb1ded13ba765b3bd77fcf167f55) | `BOOTSTRAPPING`, `initialize` still failing |
| Publish transaction | `06fd574d6c8e23e20606130a2a579b3e171d72272e23625fb9da3c1799ff8ade` | the preprod publish that landed |
| Public verification | `/verify/<id>` on the live app | needs no account or shared secret |
| Product proposal | [PROPOSAL.md](PROPOSAL.md) | problem, privacy claims and limits, rollout |
| Usage guide | [docs/USAGE.md](docs/USAGE.md) | run locally, connect a wallet, deploy, verify, troubleshoot |
| Audit record | [docs/AUDIT.md](docs/AUDIT.md) | findings applied vs risks left open |
| Feedback documentation | [docs/FEEDBACK.md](docs/FEEDBACK.md) | heard → changed, tied to commits |
| User validation | [USERS.md](USERS.md) | 58 exported responses and the checks run against them |
| Feedback form | [forms.gle/s5ErHwUmUsfARjpo6](https://forms.gle/s5ErHwUmUsfARjpo6) | collection point |
| Review tracker | [Google Sheet](https://docs.google.com/spreadsheets/d/12_wo1pkArdF5-j2_LvKGpiHiZExpY--uO0Sw5xErdG8/edit?gid=37793418) | source of the USERS.md export |
| Preprod faucet | [midnight-tmnight-preprod.nethermind.dev](https://midnight-tmnight-preprod.nethermind.dev/) | tNIGHT for a deployer or pilot wallets |

---

## Privacy Model

| Layer | What exists | Who can see it |
|---|---|---|
| **Public (on-chain)** | `status`, `owner`, `sequence`, `credentialAccumulator`, `credentialCount`, `proofCount`, `lastAttestation`, `lastAttestationScope` | anyone, via the indexer |
| **Private (holder device)** | credential secrets, issuer binding, attestation entropy, registry operator key material | the holder's browser only |
| **Proven without revealing** | that a commitment is registered under the operator's key and satisfies the requested predicate for this scope | the verifier, via the ZK proof |

Raw secrets, holder identifiers and uniqueness nullifiers are computed inside circuit witness
execution and are never submitted to the ledger.

### Limits, stated plainly

- **There is no on-chain uniqueness enforcement.** The ledger keeps no nullifier set, so
  "one person, one credential" is an *off-chain registry policy* — circuit-checked per proof, not
  prevented by the chain. A holder can register more than once if the issuer does not stop them.
- **`initialize` is front-runnable.** Anyone who can reach the published contract before the
  operator can attempt the bootstrap transition.
- **The browser vault is obfuscation, not custody.** Private state is stored in `localStorage`
  behind a passphrase; that raises the cost of casual reading, it does not make the data
  server-side-safe.
- **A proof is only as good as the attestation.** N-VA proves a predicate over an issued
  commitment; it does not prove the real-world fact that led the issuer to issue it.

---

## How It Works

1. **Bootstrap.** The operator publishes the Compact contract and runs `initialize`, moving the
   registry from `BOOTSTRAPPING` to `LIVE`.
2. **Issue.** The registry creates a credential for a holder. The holder's client derives the
   credential secret locally and submits only `commitment = H(secret, issuer)`.
3. **Accumulate.** The contract folds the commitment into `credentialAccumulator` and increments
   `credentialCount`. Nothing about the holder is recorded.
4. **Prove.** A verifier defines a policy (locally parsed rules, or natural language compiled
   server-side through Qwen and then re-validated locally). The holder's client generates the
   attestation witness and produces a proof for that scope; only the disclosed predicates leave
   the device.
5. **Verify.** Anyone can open `/verify/<id>` and re-check the attestation against the contract's
   public state through the indexer — no account, no shared secret.

---

## Protocol Feedback Loop

Every transition writes into on-chain state and the indexer streams that state back to the UI, so
what a screen shows is the chain's number, not a local counter.

- **register → state.** Each accepted commitment mutates `credentialAccumulator` and
  `credentialCount`; the portal and dashboard render what the indexer reported.
- **attest → state.** `lastAttestation` and `lastAttestationScope` update, `proofCount`
  increments; the reputation and activity views read those values back.
- **suspend / resume → state.** `status` moves between `LIVE` and `SUSPENDED`; the UI gates
  issuing and proof generation on the reported status rather than assuming it.
- **Failure feedback.** `/api/ledger/state` has a hard timeout and a cache, and the dashboard
  distinguishes *not indexed yet* from *failed*. A dropped indexer subscription surfaces as
  standby, never as simulated success.
- **Mode honesty.** In `simulation` mode the app proves locally against the proof engine and the
  chrome shows a mode badge. Nothing in simulation mode is labelled as ledger-bound.

---

## On-Chain Deployment

| Network | Contract address | Status | Evidence |
|---|---|---|---|
| **Midnight Preprod** | [`02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada`](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada) | **`LIVE`** — initialized and exercised end to end | publish `06fd574d6c8e23e20606130a2a579b3e171d72272e23625fb9da3c1799ff8ade` · initialize `91caece98fa1e8f31c576c423ea847b37cb65869b7ea682161d0001ade5e40b9` (block `c1ec562c…`) · registerCredential `c13a38994debaa94aefb0d277abaea0d5908654b79acc57732c884f6dd0a4d17` · attest `ab212a78266fba46653473ede1d2de7885250f90dadd52c7de6affc2452a2d68` — all listed under the [contract page](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada) |
| **Midnight Preview** | [`9b11813f66286fd2806517a0e076ca19898ceb1ded13ba765b3bd77fcf167f55`](https://preview.midnightexplorer.com/address/9b11813f66286fd2806517a0e076ca19898ceb1ded13ba765b3bd77fcf167f55) | `BOOTSTRAPPING` — published, `initialize` failed client-side | deploy tx `e99195b8…` (see [docs/AUDIT.md](docs/AUDIT.md)) |

Read back with `npm run deploy:verify preprod <address>` — it decodes the contract's public state
straight from the indexer, independently of the deploy script that wrote it. Measured on 2026-09-30:

```
status               : LIVE
credentialCount      : 1
proofCount           : 1
credentialAccumulator: 5af062a25d662922d827ca02…
lastAttestation      : 6493674cda0f90fd16fa924b…
lastAttestationScope : nova:test:hackspire-grant
```

So publish, `initialize`, `registerCredential` and `attest` have all executed on-chain against the
deployed contract, and the counters the UI renders are the chain's own. The run's stage timings:
wallet sync **12.3s**, dust readiness **20.0s**, submit **1.9s**, initialize + circuit exercise
**54.2s**. Two gaps remain honest: the indexer scan did not resolve a numeric block height for the
publish tx (recorded as `pending-indexer` in `.deploy/preprod.json`), and **preview is still
`BOOTSTRAPPING`** — its `initialize` was never re-attempted after the runtime pin.

**Deployer (preprod):** `mn_addr_preprod1qlzf6h6zjhyms2p3y4vu5p278zqkqqaqk9nualrndghgxywseres5hth5u`

**Live app:** [nova-git-main-nandini-das-projects.vercel.app](https://nova-git-main-nandini-das-projects.vercel.app/) —
one Vercel build from `main`. Which network and which contract it reads are fixed at build time by
`NEXT_PUBLIC_MIDNIGHT_*` (see [Hosting](#hosting-vercel)), and it is not reachable anonymously yet.

| Service | Endpoint | Purpose |
|---|---|---|
| Preprod Indexer GraphQL | `https://indexer.preprod.midnight.network/api/v4/graphql` | contract state reads |
| Preprod Indexer WS | `wss://indexer.preprod.midnight.network/api/v4/graphql/ws` | live state subscription |
| Preprod Node RPC | `https://rpc.preprod.midnight.network` | transaction submission |
| Preview Indexer / Node | `https://indexer.preview.midnight.network/api/v4/graphql`, `https://rpc.preview.midnight.network` | preview reads and writes |
| Proof server | `http://localhost:6300` (loopback only) | witness + proof generation; the deploy script refuses a non-loopback URL |

---

## User Validation 

Full data, checks and row-level detail: **[USERS.md](USERS.md)**.

| Measured | Value |
|---|---|
| Feedback responses collected | **58** (`01/09/2026` → `29/09/2026`) |
| Average rating | **3.74 / 5** (5★ ×10, 4★ ×23, 3★ ×25) |
| Wallet entries supplied | 58, **49 unique**, 8 duplicate groups |
| Entries in Midnight `mn_addr_preprod1…` format | **0** |

**The Level 5 "50 unique Preprod user wallets" criterion is not met**, and USERS.md says so rather
than rounding it over: every supplied address is an `0x…` EVM-style string, nine rows repeat an
address, and eleven follow a sequential-nibble pattern consistent with placeholder values. None can
be resolved on the Midnight preprod indexer. These are recorded as *feedback received*, not as
proof of N-VA usage on preprod. What closes the gap is written at the bottom of that file: real
credential and attestation transactions from the deployed contract, each verifiable by hash.

### The respondents

58 form responses, from **55 distinct people** (three submitted
twice). First name and last initial only — the tracker also holds full names and emails, which were
not consented for publication and are not what the criterion asks for.

| # | Respondent | Date | Rating | Wallet (as supplied) |
|---|---|---|---|---|
| 1 | Chandranshu D. | 01/09/2026 | 3 | `0x71CB05EE…` |
| 2 | Ankan D. | 01/09/2026 | 3 | `0x3a4fB92C…` |
| 3 | Indrajit A. | 02/09/2026 | 4 | `0x9812A6b4…` |
| 4 | Srija M. | 02/09/2026 | 5 | `0x4B2C81f3…` |
| 5 | Ishan D. | 03/09/2026 | 4 | `0x8a92F1c4…` |
| 6 | Avishek M. | 03/09/2026 | 3 | `0x12c4b5e6…` |
| 7 | Shuvam D. | 04/09/2026 | 5 | `0xC3d4e5f6…` |
| 8 | Uzzal S. | 04/09/2026 | 3 | `0xE1f2A3b4…` |
| 9 | Tiyasa M. | 05/09/2026 | 3 | `0xA9b0C1d2…` |
| 10 | Sudipta M. | 05/09/2026 | 5 | `0x5B6c7D8e…` |
| 11 | Shreya D. | 06/09/2026 | 4 | `0xD4e5F6a7…` |
| 12 | Bristi S. | 06/09/2026 | 3 | `0xF6a7B8c9…` |
| 13 | Debjit K. | 07/09/2026 | 3 | `0x2A3b4C5d…` |
| 14 | Jishu D. | 07/09/2026 | 4 | `0xC5d6E7f8…` |
| 15 | Saikat P. | 08/09/2026 | 3 | `0x7F8a9B0c…` |
| 16 | Rishav B. | 08/09/2026 | 4 | `0xB0c1D2e3…` |
| 17 | Rajdip G. | 09/09/2026 | 3 | `0xE3f4A5b6…` |
| 18 | Sounak B. | 10/09/2026 | 3 | `0x8E9f0A1b…` |
| 19 | Most S. | 10/09/2026 | 4 | `0x1B2c3D4e…` |
| 20 | Diganta N. | 11/09/2026 | 3 | `0xD4e5F6a7…` |
| 21 | Sankhadip M. | 11/09/2026 | 4 | `0xA7b8C9d0…` |
| 22 | ROHAN S. | 12/09/2026 | 3 | `0xD0e1F2a3…` |
| 23 | Sanchita S. | 12/09/2026 | 3 | `0xF2a3B4c5…` |
| 24 | SHOBHA B. | 13/09/2026 | 4 | `0xB4c5D6e7…` |
| 25 | Rikita R. | 14/09/2026 | 4 | `0x9B0c1D2e…` |
| 26 | Tanish K. | 14/09/2026 | 4 | `0x1D2e3F4a…` |
| 27 | Mainak K. | 15/09/2026 | 3 | `0x3F4a5B6c…` |
| 28 | DEBOSHREYA G. | 15/09/2026 | 4 | `0x5B6c7D8e…` |
| 29 | ABHISHEK D. | 16/09/2026 | 4 | `0x7D8e9F0a…` |
| 30 | Sourav S. | 16/09/2026 | 3 | `0x9F0a1B2c…` |
| 31 | Puskar A. | 17/09/2026 | 3 | `0x1B2c3D4e…` |
| 32 | Ananya B. | 18/09/2026 | 4 | `0xE5f6A7b8…` |
| 33 | Soumya C. | 18/09/2026 | 5 | `0xA7b8C9d0…` |
| 34 | Rahul M. | 19/09/2026 | 3 | `0xC9d0E1f2…` |
| 35 | Sneha R. | 19/09/2026 | 4 | `0xE1f2A3b4…` |
| 36 | Arindam G. | 20/09/2026 | 5 | `0x2A3b4C5d…` |
| 37 | Puja S. | 20/09/2026 | 3 | `0x4C5d6E7f…` |
| 38 | Abhishek N. | 21/09/2026 | 4 | `0x6E7f8A9b…` |
| 39 | Riya S. | 21/09/2026 | 3 | `0x8A9b0C1d…` |
| 40 | Kaushik B. | 22/09/2026 | 5 | `0xB0c1D2e3…` |
| 41 | Priyanka D. | 22/09/2026 | 4 | `0xD2e3F4a5…` |
| 42 | Amitava P. | 23/09/2026 | 3 | `0xF4a5B6c7…` |
| 43 | Srijit M. | 23/09/2026 | 5 | `0xA5b6C7d8…` |
| 44 | Moumita S. | 24/09/2026 | 4 | `0xC7d8E9f0…` |
| 45 | Bipasha G. | 24/09/2026 | 3 | `0xE9f0A1b2…` |
| 46 | Kazi R. | 25/09/2026 | 5 | `0x0A1b2C3d…` |
| 47 | Sumit P. | 25/09/2026 | 4 | `0x2C3d4E5f…` |
| 48 | Nandini B. | 26/09/2026 | 3 | `0x4E5f6A7b…` |
| 49 | Tathagata S. | 26/09/2026 | 5 | `0x6A7b8C9d…` |
| 50 | Pallavi D. | 27/09/2026 | 4 | `0x8C9d0E1f…` |
| 51 | Ritwik H. | 27/09/2026 | 3 | `0xD0e1F2a3…` |
| 52 | Subhamita K. | 28/09/2026 | 4 | `0xF2a3B4c5…` |
| 53 | Deep N. | 28/09/2026 | 5 | `0x3B4c5D6e…` |
| 54 | Anita C. | 29/09/2026 | 3 | `0x5D6e7F8a…` |
| 55 | Vikram S. | 29/09/2026 | 4 | `0x7F8a9B0c…` |

**What this list is:** real people who answered the project feedback form between 01/09 and 29/09,
whose responses we read and triaged.
**What this list is not:** evidence of 50 verified N-VA users on Midnight preprod. The 58 wallet
entries collapse to 49 unique strings, none of them in `mn_addr_preprod1…` format, so none resolves
on the preprod indexer; and the requests themselves (gas estimates, Polygon, WalletConnect, ENS,
staking, fiat on-ramps, bridges, widgets) describe a multi-chain wallet, not this dApp. Full export
with the checks: [USERS.md](USERS.md).

---

## Feedback Documentation

Full What-We-Heard / What-We-Changed record, cross-referenced to commits:
**[docs/FEEDBACK.md](docs/FEEDBACK.md)**.

### Feedback acted on, tagged to commits

Every row below is a failure or finding that was observed on this codebase and a change that landed
because of it. Open any hash with `git show`.

| Heard / observed | Changed | Commit |
|---|---|---|
| "Deploys take unusually long" — the v4 indexer dropped `block.transactions.dustLedgerEvents`, so **every** run replayed ~1.57M dust events from genesis | SDK `serialize()`/`restore()` wallet checkpoints; one process owns one checkpoint file | `8e0bb78` |
| "A single sync process dies mid-run" — ~40 KB retained per event, V8 aborts around 6.6 GB | Heap-bounded, time-bounded chunks under a supervisor that aborts on a detected stall | `0f89b92` |
| "The sync looked alive for hours while going nowhere" — the load-time cursor bump was being persisted, so each resume silently skipped one real event until the WASM dust tree refused to resume | Calibration driver that reads the tree's own *expected vs received* leaf numbers and rewinds/advances the cursor until the resume applies cleanly | `e09f79f` |
| "Dead chunks still counted as progress" | Progress measured against the restored baseline; `applied=0` aborts instead of looping; outcome on a machine-readable line | `7eaacea`, `90e6208` |
| "The un-bump fixed one tree and broke two others" (`zswap`, dust generation: `received = expected − 1`) | Cursor persisted exactly as reported; the phantom is handled where it is measured | `c44c1fd` |
| "The wallet never reports synced at the tip" — SDK demands `|highestTransactionId − appliedId| === 0` against a cap that froze at `569484` while the cursor rose to `569512` | A connected cursor at or above the served cap is treated as complete | `8c59844` |
| "Submissions hang and the deploy shows nothing" | Bounded finalization, eight timed stages, publishes-once guard, loopback-only proof-server assertion | `db20b8c` |
| "`/api/ledger/state` opened an indexer subscription per request" | Cached reads with a hard timeout | `7c66daf` |
| "Docs claim privacy the contract doesn't enforce" — there is no nullifier set | Privacy limits stated plainly in the README and carried as open risks | `83cffc5`, `be16498` |
| "`initialize` aborts with `expected instance of StateValue`" | `onchain-runtime-v3` pinned and deduped to a single hoisted 3.0.0 copy | `a03a169` |

The 58 form responses are deliberately **not** in this table. Their requests — gas-fee estimates,
Polygon and L2 support, WalletConnect stability, ENS, staking, NFTs, fiat on-ramps, hardware wallets,
multi-sig, bridges, CSV export, iOS widgets, a light theme — match nothing in this codebase, so there
is no honest commit to tag them to. Verbatim export and the checks run against it: [USERS.md](USERS.md).

- **[Product proposal](PROPOSAL.md)** — problem, users, privacy claims and rollout.
- **[Usage guide](docs/USAGE.md)** — local run, wallet connect, deploy and verification.
- **[Protocol feedback loop](#protocol-feedback-loop)** — on-chain state back to the UI, above.
- **[Audit record](docs/AUDIT.md)** — findings, fixes applied, risks left open.

Two external collection links, as claims of where responses came from (the numbers above are the
measured export, not a promise): [feedback form](https://forms.gle/s5ErHwUmUsfARjpo6) ·
[user review tracker](https://docs.google.com/spreadsheets/d/12_wo1pkArdF5-j2_LvKGpiHiZExpY--uO0Sw5xErdG8/edit?gid=37793418).

---

## Diagrams

Rendered copies of the sources in `docs/diagrams/` — those files stay canonical
([actors](docs/diagrams/user-diagram.md) · [use cases](docs/diagrams/use-case.md) ·
[user flows](docs/diagrams/user-flow.md) · [data model](docs/diagrams/er-diagram.md) ·
[architecture](docs/diagrams/architecture.md) · [app map](docs/diagrams/app-diagram.md)).
Every node reflects code that exists in this repository, not a planned state.

### Actors and users

```mermaid
flowchart TB
    subgraph Humans["Human actors"]
        H["Holder / Applicant<br/>(student, developer, voter, claimant)"]
        O["Organization / Verifier<br/>(grant foundation, hackathon, DAO)"]
        D["Developer / Integrator<br/>(reads /developers, runs deploy script)"]
        J["Judge / Evaluator<br/>(runs the guided demo)"]
    end

    subgraph Systems["Non-human actors"]
        MW["Midnight Wallet extension<br/>(Lace / 1AM via DApp Connector)"]
        QE["Qwen LLM<br/>(policy classification only)"]
        MC["Midnight Preprod<br/>(Nova Compact contract + indexer)"]
        PE["NØVA Proof Engine<br/>(device-side predicates + circuit)"]
    end

    H -->|"connects · holds vault · generates proofs"| PE
    H <--> MW
    O -->|"creates verification · receives claims-only results"| H
    D -->|"compiles · publishes · interacts"| MC
    J -->|"runs applicant + verifier views"| H
    O -.->|"optional: NL policy"| QE
    QE -.->|"validated requirement ids"| O
    PE -.->|"public aggregates via<br/>GET /api/ledger/state"| MC
    D -->|"attest circuits on-chain via<br/>proof server + providers"| MC
```

### Use cases

```mermaid
flowchart TB
    subgraph AC["NØVA application boundary"]
        direction LR
        UC1(["Browse proof-privacy landing"])
        UC2(["Launch guided demo<br/>/demo"])
        UC3(["Connect Midnight wallet"])
        UC4(["Create private vault<br/>(AES-GCM, device-bound)"])
        UC5(["Issue / receive credentials"])
        UC6(["Add custom credential"])
        UC7(["Generate private proof<br/>(claims-only)"])
        UC8(["Submit proof to scope"])
        UC9(["Generate reputation<br/>predicate proof"])
        UC10(["View activity log / clear"])
        UC11(["View verification result<br/>/verify/:id"])
        UC12(["Destroy vault"])
        UC13(["Create verification request"])
        UC14(["Compile NL policy →<br/>requirement ids"])
        UC15(["Share /grant link"])
        UC16(["Check received proofs"])
        UC17(["Switch engine mode<br/>(env-gated)"])
        UC18(["Read public ledger state<br/>(indexer)"])
        UC19(["Publish Nova contract<br/>deploy:ledger"])
        UC20(["Test contract interactions<br/>registerCredential · attest"])
        UC21(["Read developer docs"])
    end

    H(["Holder"]) --- UC1
    H --- UC2
    H --- UC3
    H --- UC4
    H --- UC5
    H --- UC6
    H --- UC7
    H --- UC8
    H --- UC9
    H --- UC10
    H --- UC12
    H --- UC21

    O(["Organization / Verifier"]) --- UC13
    O --- UC14
    O --- UC15
    O --- UC16
    O --- UC11
    O --- UC17

    J(["Judge / Evaluator"]) --- UC2
    J --- UC11

    D(["Developer / Operator"]) --- UC19
    D --- UC20
    D --- UC18
    D --- UC21

    W(["Midnight Wallet extension"]) -.-> UC3
    M(["Midnight Preprod<br/>Nova contract"]) -.-> UC8
    M -.-> UC19
    M -.-> UC20
    M -.-> UC18
    Q(["Qwen API"]) -.-> UC14

    UC7 -.->|«include»| UC4
    UC8 -.->|«include»| UC11
    UC13 -.->|«extend»| UC14
```

### 1. Core flow: connect → credential → select → prove → verify

```mermaid
sequenceDiagram
    actor H as Holder
    participant App as NØVA Web App
    participant W as Midnight Wallet (DApp Connector)
    participant V as Credential Vault (device, AES-GCM)
    participant E as Verification Engine (proofs.ts)
    participant LS as GET /api/ledger/state (server)
    participant IX as Indexer (GraphQL v4)
    participant C as Nova contract (Preprod)
    participant O as Verifier

    H->>App: Open grant application (/grant?request=…)
    H->>W: connectWallet() (recommended, optional on local engine)
    W-->>App: session (provider, address / coin public key)
    H->>App: Review requirements · 4 claims · 0 attributes
    App->>V: seedDemoVault() / unlock existing credentials
    V-->>E: decrypted attributes (plaintext, same device only)
    H->>E: generate private proof
    E->>E: evaluate predicates → claims[bool]
    E->>E: attestation = domain-separated fingerprint (circuit mirror, local)
    E-->>App: PrivateProof { claims, attestation, mode, attestedBy }
    App->>LS: fetch (ledger mode)
    LS->>IX: queryContractState(contractId)
    IX-->>LS: aggregates · lastAttestation fingerprint
    LS-->>App: public binding shown on result page
    App->>O: submit proof (claims + fingerprint only)
    O->>LS: verify binding (indexer query via server route)
    C-->>O: VERIFIED · 4/4 · 0 personal attributes revealed
```

### 2. Guided demo (`/demo`)

```mermaid
flowchart TD
    A[Open NØVA] --> B[Connect wallet]
    B --> C[Select verification<br/>HackSpire Grant]
    C --> D[Private data sealed in vault<br/>nothing typed, nothing uploaded]
    D --> E[Generate proof<br/>engine: unlock → circuit → seal]
    E --> F{requirements satisfied?}
    F -- no --> R[ProofRejectionError<br/>shown honestly, nothing submitted]
    F -- yes --> G[Submit proof · verified by local engine]
    G --> H[Attestation fingerprint · ledger mode adds<br/>public aggregates via /api/ledger/state]
    H --> I[Verifier view: 4 boolean claims + fingerprint<br/>status VERIFIED]
    I --> J[Replay: uniqueness already claimed —<br/>reset button demonstrates anti-sybil]
```

### 3. Verifier flow (`/dashboard/requests`)

```mermaid
flowchart LR
    S[NL policy text] --> P["/api/policy<br/>Qwen or local parser"]
    P -->|validated ids| F[Requirement checklist prefilled]
    F --> CR[Create request → ProofRequest]
    CR --> SH[Shareable /grant?request=ID link]
    SH --> RP[Received proofs list]
    RP --> RS[Check result → VerifyResult<br/>claims-only panel]
```

---

## App Screenshots

Captured headlessly from the **local production build** (`npm run build && npm run start`) with
`scripts/capture-screenshots.sh`, `NEXT_PUBLIC_MIDNIGHT_MODE` unset — i.e. **simulation mode**, so
these screens show locally-executed proofs and no ledger-bound state. The hosted Vercel deployment
is behind Deployment Protection and was not captureable anonymously.

| Desktop 1440×900 | Mobile 390×844 |
|---|---|
| ![Landing — WebGL vault hero](docs/screenshots/nova-desktop.png)<br/>Landing — WebGL vault hero | ![Landing (390×844)](docs/screenshots/nova-mobile.png)<br/>Landing (390×844) |
| ![Holder dashboard](docs/screenshots/dashboard-desktop.png)<br/>Holder dashboard | ![Dashboard (390×844)](docs/screenshots/dashboard-mobile.png)<br/>Dashboard (390×844) |
| ![Grant verification flow](docs/screenshots/verification-desktop.png)<br/>Grant verification flow | ![Verification (390×844)](docs/screenshots/verification-mobile.png)<br/>Verification (390×844) |

Verification note: this environment cannot view images, so the set was checked automatically — all
six files are distinct (unique SHA-256), 149–706 KB each, and the 594 KB landing capture confirms
the React-Three-Fiber scene actually rasterised rather than an error page. They are published for a
human visual pass, not certified by one.

---

## App Surface

| Route | What it is |
|---|---|
| `/` | landing — hero, WebGL vault scene, architecture and data-to-proof flow |
| `/dashboard` | holder overview (live credential and proof counters) |
| `/dashboard/credentials` | the private credential vault |
| `/dashboard/proofs` | proof runner and history |
| `/dashboard/requests` | inbound verifier requests |
| `/dashboard/reputation` | scope reputation and attestations |
| `/dashboard/activity` | indexer-driven activity feed |
| `/dashboard/settings` | policy, disclosure and storage settings |
| `/verify/[id]` | public verification, no account required |
| `/demo`, `/grant`, `/developers` | scripted demo, grant application flow, integration guide |
| `/api/policy`, `/api/ledger/state` | server-side policy compilation; cached, timeout-bounded ledger reads |

---

## App Architecture

```
newproject/
├── contract/                 # NØVA Compact contract
│   ├── src/nova.compact      #   5 circuits: initialize, registerCredential, attest, suspend, resume
│   ├── src/witnesses.ts      #   witness derivation
│   ├── src/test/             #   circuit + metadata tests (Vitest)
│   └── src/managed/nova/     #   compiled artifacts: zkir/bzkir, proving + verification keys
├── src/
│   ├── app/                  # Next.js 15 App Router: pages, dashboard, /api routes
│   ├── components/           # ui primitives, site chrome, dashboard, home, WebGL scene
│   └── lib/
│       ├── midnight/         # network, crypto, credentials, proofs, wallet connector, contracts
│       ├── policy/           # local rule parser, Qwen compiler, client
│       └── store.ts          # session state
├── scripts/                  # wallet bootstrap, checkpointed sync, deploy, verify, evidence capture
└── docs/                     # diagrams, audit record, usage, feedback
```

- **Read path (browser):** the UI subscribes to the indexer over GraphQL/WebSocket and renders
  contract state; there is no seeded or simulated ledger data in the app.
- **Write path (server/CLI):** proving needs the local proof server, so deploy and circuit calls
  run through `scripts/` with a polkadot submission service, not from the browser.
- **Wallet connect:** the real injected DApp Connector under `window.midnight` (v4 plus the legacy
  `enable()` shape) with Midnight Lace or 1AM Wallet. No fabricated accounts, no mock balances —
  with no provider injected, the UI says so.
- **Sync strategy:** the v4 indexer dropped the per-block dust-event queries the old fast path used,
  so booting replays ~1.57M dust events on preprod. `scripts/lib/wallet-provider.ts` persists SDK
  wallet checkpoints and resumes from them; `scripts/supervise-deploy.sh` runs the replay in
  heap-bounded chunks. Measured: first full sync hours, resumed sync **42.8 s**.

---

## Quick Start

**Requirements:** Node `>=22 <26`, Docker for the proof server, Midnight Lace or 1AM Wallet, tNIGHT
from the [preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/) for the deployer.

```bash
npm install
cp .env.example .env.local                    # set NEXT_PUBLIC_MIDNIGHT_MODE=ledger for real ledger state

docker run -d --rm -p 127.0.0.1:6300:6300 midnightntwrk/proof-server:8.1.0

npm run dev                                   # http://localhost:3000
```

Deploy to a network (publish → initialize → test every circuit → record the result):

```bash
npm run wallet:init preprod                   # local seed generation; prints only the address
npm run deploy:supervised preprod             # chunked sync to the tip, then deploy
npm run deploy:verify preprod <contract address>
```

---

## Hosting (Vercel)

Live at **https://nova-git-main-nandini-das-projects.vercel.app/**, built from `main`.

Repo side (committed): `vercel.json` declares the Next.js framework, `npm run build`, an
`npm install` install command, `bom1` functions and conservative response headers
(`nosniff`, `DENY` framing, strict referrer, no camera/mic/geolocation). `.nvmrc` pins Node 22,
inside the package's `engines` range (`>=22 <26`). No CSP is set — a nonce-based policy needs
`style-src` work on the Tailwind/inline-style output, so it is deliberately not claimed here.

The root build is `npm run build --workspace=nova-contract && next build`; the contract's
`prebuild` runs `compact` **only if the toolchain is on PATH** and otherwise uses the compiled
artifacts committed under `contract/src/managed/nova/`, so Vercel needs no Compact install.

**Environment variables to set in the Vercel dashboard** (Project → Settings → Environment
Variables). They are baked at build time, so a change needs a redeploy:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_MIDNIGHT_MODE` | `simulation` or `ledger` |
| `NEXT_PUBLIC_MIDNIGHT_NETWORK_ID` | `preprod` |
| `NEXT_PUBLIC_MIDNIGHT_INDEXER_URL` | `https://indexer.preprod.midnight.network/api/v4/graphql` |
| `NEXT_PUBLIC_MIDNIGHT_NODE_URL` | `https://rpc.preprod.midnight.network` |
| `NEXT_PUBLIC_MIDNIGHT_CONTRACT_ID` | the full preprod address from the deployment table below |

Never add `MIDNIGHT_WALLET_SEED`, `MIDNIGHT_PREPROD_SEED` or `MIDNIGHT_PRIVATE_STATE_PASSWORD` to
Vercel. Those are deploy-operator secrets for the local scripts; anything prefixed
`NEXT_PUBLIC_` is readable by every visitor's browser.

**One setting blocks the demo:** Vercel → Project → Settings → **Deployment Protection** → turn
*Vercel Authentication* off (or add a bypass secret to the URL). Until then, anonymous requests —
including a reviewer's — are redirected to `vercel.com/sso-api`, so the app cannot be opened.
Know the tradeoff before switching it off: `/api/policy` becomes reachable by anyone, it only
calls Qwen when a server-side `QWEN_API_KEY` is present, and nothing rate-limits it today.

---

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main`, on pull requests, and on manual dispatch.

| Job | Steps | Budget |
|---|---|---|
| `verify` | `npm ci` → `lint` → `typecheck` → `test` → `build` → assert the deployed registry is `LIVE` | `timeout-minutes: 5` |
| `deploy` | Vercel production deploy, only when `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` secrets exist | `timeout-minutes: 5` |

The 5-minute requirement is **enforced by the workflow**, not claimed in prose: `timeout-minutes: 5`
fails the run if the gate overruns. The same gate measures **35.0 s** locally
(`lint && typecheck && test && build`).

**First run on GitHub: green.** [Run 36646595950](https://github.com/mathsphile/N-VA/actions/runs/36646595950)
completed `success` in **107 s** wall clock on `9c22216`, every step passing — including `npm ci`
from the regenerated lockfile and the live-registry assertion against the public indexer. That is
~2.8× headroom inside the 5-minute budget.

**The second run went red, and it was a real bug.** `c986b47` — a commit that touched only the
README — failed at **Build** in 65 s. The cause was `next build` fetching font metadata from Google
at build time: when that response came back unusable, the loader threw
`TypeError: Cannot read properties of null (reading '1')` inside `@next/font/dist/google/loader.js`.
Inter and JetBrains Mono are now self-hosted (`src/app/fonts`, variable `woff2`, SIL OFL, attributed)
and loaded through `next/font/local`, so the build has **no network dependency** — and a visitor's
browser no longer makes a request to Google, which suits a privacy product.

Two honest caveats:

- The suite is **2 tests** (`contract/src/test/metadata.test.ts`, ~1 s). It pins circuit metadata and
  bindings against the compiled artifacts; it does not yet cover the policy parser, the credential
  commitment path or the proof engine. That is the weakest part of this pipeline.
- The `LIVE` assertion reads the **public preprod indexer** with no secrets, so CI fails loudly if the
  deployed registry is reset or stops decoding — `grep -Eq 'status[[:space:]]+: LIVE'` against real
  `npm run deploy:verify` output.

The `deploy` job reports *skipped* rather than failing when those secrets are absent, because Vercel's
own Git integration already deploys `main`.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js server and production build |
| `npm run lint` / `typecheck` | ESLint over `src` + `contract/src`; strict `tsc --noEmit` for both workspaces |
| `npm test` | contract circuit tests |
| `npm run contract` | recompile Compact artifacts |
| `npm run wallet:init` | generate a deploy seed locally |
| `npm run wallet:check` | funded / synced / fee-ready report |
| `npm run deploy:sync` | one bounded sync chunk (exit 0 = synced) |
| `npm run deploy:supervised` | chunk loop to completion, then deploy; aborts on a detected stall |
| `npm run deploy:heal` | recalibrate a drifted checkpoint cursor against the WASM tree oracle |
| `npm run deploy:ledger` | publish + initialize + exercise circuits, with stage timings |
| `npm run deploy:verify` | decode a deployed contract's public state from the indexer |

---

## Status

### Working — and how to check each line

| Claim | Evidence anyone can reproduce |
|---|---|
| Registry is **`LIVE`** on preprod | `npm run deploy:verify preprod 02f0cde4…` → `status: LIVE`, `credentialCount 1`, `proofCount 1`, non-empty accumulator. Or open the [contract page](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada). |
| Whole lifecycle ran on-chain | publish `06fd574d…` · initialize `91caece9…` (block `c1ec562c…`) · registerCredential `c13a3899…` · attest `ab212a78…`, scope `nova:test:hackspire-grant` |
| Deploys survive a crash | Run 2 logged `Resuming existing deployment — NOT re-publishing` against `.deploy/pending-preprod.json`; no second contract was created |
| Sync is resumable, not heroic | resumed sync **12.3 s** and dust readiness **20.0 s**, against hours of genesis replay before the checkpoint work |
| The repo is green | `npm run lint`, `typecheck`, `test` and `build` all exit 0; the whole gate measures **35.0 s** locally and CI caps it at 5 minutes |
| Wallet path is real | injected `window.midnight` DApp Connector (Lace / 1AM); with no provider the UI reports that instead of inventing an account |
| It is hosted | Vercel build from `main` at the URL above |

### Outstanding — not claimed as done

- **Preview is still `BOOTSTRAPPING`.** `9b11813f…` was published but its `initialize` was never
  re-attempted after the runtime pin. Only preprod is live.
- **No numeric block height for the publish tx.** The indexer scan didn't resolve it, so
  `.deploy/preprod.json` records `pending-indexer` rather than a guessed number.
- **Reviewers cannot open the hosted app yet.** Vercel Deployment Protection answers
  `302 → vercel.com/sso-api` (verified 2026-09-30). One dashboard toggle fixes it — see
  [Hosting](#hosting-vercel). Until then, the live URL is a claim, not a demo.
- **Screenshots are simulation-mode and machine-checked only.** Six distinct captures, 149–706 KB,
  verified by SHA-256 and size (the 594 KB landing shot proves the WebGL scene rasterised) — but no
  human has viewed them, and `.env.local` is now in ledger mode, so a ledger-backed re-capture is
  owed.
- **The test suite is 2 tests.** Circuit metadata and bindings only; the policy parser, credential
  commitment path and proof engine are uncovered.
- **CI passes, but on 2 tests.** The first run is green (107 s, every step) — see
  [Continuous integration](#continuous-integration). What is weak is the suite behind it, not the
  pipeline.
- **Level 5 user validation is unmet.** 0 of 58 form wallet entries are Midnight-format, so none
  resolves on the indexer. With the registry now live, the missing rows are obtainable for real:
  holder address + transaction hash + indexed height ([USERS.md](USERS.md)).
- **Contract-level risks are unchanged:** no nullifier set (uniqueness is registry policy, not
  enforcement), `initialize` front-runnable, passphrase-gated `localStorage` vault is obfuscation,
  single-seed role derivation in the scripts, and the `postcss`/`next` advisory left unfixed pending
  an authorised toolchain bump. Full list: [docs/AUDIT.md](docs/AUDIT.md).
- **The demo video is not verifiable from here** — this environment cannot stream or view it, so the
  README attests only to the on-chain state above, not to what the recording shows.
