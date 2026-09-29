# N-VA — Product Proposal

**Private Proof Network on Midnight.** Prove you are eligible, without handing over the data that
proves it.

---

## The problem

Access decisions — grants, airdrops, age-gated services, exam eligibility, community trust — are
currently paid for with personal data. A user who wants to prove "I am in this region, I am
enrolled, I have not claimed twice" must first disclose their name, documents and identifiers to
whoever is deciding. That creates three failures at once:

- **Over-collection.** The verifier keeps attributes they never needed.
- **Friction.** Manual document review slows every decision and centralises power in whoever holds
  the folder.
- **No portability.** Proof of eligibility lives in one institution's database and has to be
  re-earned everywhere else.

The core principle behind N-VA: **verify the claim, not the data.**

## What N-VA does

A registry issues a credential commitment to a holder's browser. The holder's client holds the
secret; the chain holds a one-way binding of it. When a verifier asks whether a holder satisfies a
predicate for a scope, the holder's client generates a zero-knowledge proof of that predicate and
discloses only what the policy asked for. The verifier receives a result and an attestation, the
ledger receives an aggregate counter, and nobody receives the attribute.

Use cases we are building for: grant applications, compliance and age checks, airdrop and sybil
resistance, student and institutional enrollment, trust-tier access to services.

## Why Midnight

Midnight's Compact model lets a contract hold *selective-disclosure* state: ledger-visible
commitments and counters alongside circuit-checked proofs, with an indexer that streams public state
to any client. That is the property this product needs — a public record that can be audited without
being a surveillance record.

## How it works

1. **Issue.** Registry derives a commitment `H(secret, issuer)` in the holder's client; only the
   commitment is submitted.
2. **Accumulate.** The contract folds it into `credentialAccumulator` and increments
   `credentialCount`. No holder identifier exists on-chain.
3. **Request.** A verifier defines a policy — locally parsed rules, or natural language compiled
   server-side through Qwen and then re-validated by the local parser before it is trusted.
4. **Prove.** The holder's client generates the attestation witness and proof for that scope, using
   a local proof server; witness material never leaves the machine (the deploy path asserts a
   loopback proof server).
5. **Verify.** Anyone can re-check an attestation at `/verify/<id>` against the contract's public
   state from the indexer. No account, no shared secret.

## Privacy model, stated honestly

| Public on-chain | Private on the holder's device | Proven without revealing |
|---|---|---|
| `status`, `owner`, `sequence`, `credentialAccumulator`, `credentialCount`, `proofCount`, `lastAttestation`, `lastAttestationScope` | credential secrets, issuer binding, attestation entropy, operator key material | that a registered commitment satisfies the requested predicate for this scope |

Boundaries we will not oversell:

- **Uniqueness is policy, not enforcement.** There is no nullifier set on-chain, so the chain cannot
  prevent a second issuance. The circuit proves a predicate per attestation; the registry decides
  whether to issue.
- **`initialize` is front-runnable** in the current contract — a known, documented gap.
- **The browser vault is obfuscation**, not custody.
- In `simulation` mode proofs are generated locally and the UI labels them as such; nothing
  simulated is presented as ledger-bound.

## What is built

- **Contract:** `contract/src/nova.compact` — five circuits (`initialize`, `registerCredential`,
  `attest`, `suspend`, `resume`) with compiled zkir/bzkir artifacts and proving/verification keys,
  plus circuit metadata tests.
- **App:** Next.js 15 App Router — landing, holder dashboard (credentials, proofs, requests,
  reputation, activity, settings), public verification, demo, grant and developer routes, two API
  routes. Real injected DApp Connector support (Midnight Lace / 1AM) with no fabricated accounts.
- **Operations:** checkpointed, resumable ledger sync in heap-bounded chunks with a supervisor,
  drift calibration against the WASM's own abort numbers, staged deploy with timings and a
  publishes-once guard, and an indexer-driven deployment verifier.
- **Docs:** architecture/ER/use-case/flow diagrams, this proposal, usage guide, audit record,
  feedback documentation, user validation export.

## Status (what is and is not true today)

- Contracts are **published** on preprod (`02f0cde4…`) and preview (`9b11813f…`); both read back
  from the indexer as `BOOTSTRAPPING` with zero credentials and zero proofs indexed.
- `initialize` is **not yet passing**. Current cause is a WASM runtime split between
  `compact-runtime` and `midnight-js-protocol`; it is pinned to one copy in `package.json` and the
  redeploy has to clear before the registry can be called live.
- Therefore **no end-to-end credential → proof → verification has been recorded on-chain**, and the
  user-validation requirement is not met: the collected feedback (58 responses) contains **zero**
  Midnight preprod wallet addresses — see [USERS.md](USERS.md).

## Rollout

1. Clear `initialize` on preprod; run the five circuits and record the first real attestations.
2. Pilot with a small closed group of verifiers and holders, each row in `USERS.md` filled from
   their own connected wallet and indexed transaction hash.
3. Close the two contract-level gaps — operator-gated bootstrap and a nullifier set — before any
   non-testnet issuance.
4. Open the developer route for third-party policy scopes.

## Team goal

Make trust verifiable without making personal data the price of admission. Success is measured as
attributes disclosed per completed verification trending to the minimum the decision actually needs.

## Links

Live dApp: https://nova-git-main-nandini-das-projects.vercel.app/ (Vercel, `main`; behind
Deployment Protection until it is switched off — see [README → Hosting](README.md#hosting-vercel)) ·
Demo video: https://youtu.be/XoNDS-X3bCk ·
Repository: https://github.com/mathsphile/N-VA ·
Feedback form: https://forms.gle/s5ErHwUmUsfARjpo6 ·
User review tracker: https://docs.google.com/spreadsheets/d/12_wo1pkArdF5-j2_LvKGpiHiZExpY--uO0Sw5xErdG8/edit?gid=37793418 ·
Preprod contract: https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada

License: Apache-2.0 · Program: Rise In — New Moon to Full
