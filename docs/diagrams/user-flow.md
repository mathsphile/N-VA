# NØVA — User Flows

## 1. Core flow: connect → credential → select → prove → verify

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

> Browser proofs are computed and verified **entirely on-device**; the Compact circuits
> (`registerCredential` / `attest` with real ZK proofs from the local proof server)
> are executed on-chain by the server-side tooling (`scripts/deploy-ledger.ts`),
> not by the browser. See `docs/diagrams/architecture.md`.

## 2. Guided demo (`/demo`)

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

## 3. Verifier flow (`/dashboard/requests`)

```mermaid
flowchart LR
    S[NL policy text] --> P["/api/policy<br/>Qwen or local parser"]
    P -->|validated ids| F[Requirement checklist prefilled]
    F --> CR[Create request → ProofRequest]
    CR --> SH[Shareable /grant?request=ID link]
    SH --> RP[Received proofs list]
    RP --> RS[Check result → VerifyResult<br/>claims-only panel]
```

## 4. Failure paths (all surfaced in the UI, never silent)

| Path | Behavior |
| --- | --- |
| No wallet | continue on local engine (labelled); ledger mode shows install guidance |
| Empty vault | empty state + one-click `Request demo credentials` |
| Predicate unsatisfied | `ProofRejectionError` toast + inline error, proof never leaves device |
| Duplicate uniqueness claim (same holder, same scope) | rejection: "One person, one proof" |
| Corrupt vault (wrong device key) | fail-closed: "Vault could not be decrypted on this device" |
| Ledger misconfigured | explicit badge `Local proof engine` — never a fake on-chain claim |
| Qwen down / no key | deterministic local rule parser + honest note in the result |
