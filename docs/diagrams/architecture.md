# NØVA — System Architecture

```mermaid
flowchart TD
    subgraph Holder["Holder device (browser)"]
        U[User] -->|"open"| APP["NØVA Web App<br/>(Next.js 15 · React 19 · Tailwind 4)"]
        APP -->|"connect"| WC["Wallet layer<br/>src/lib/midnight/wallet.ts<br/>DApp Connector v4 / legacy"]
        WC --> MW["Midnight Wallet<br/>(Lace · 1AM extension)"]
        APP -->|"unlock"| VLT["Private Credential Vault<br/>credentials.ts<br/>AES-GCM + PBKDF2 (device-bound)"]
        VLT -->|"attributes (plaintext,<br/>local only)"| PE["Verification engine<br/>proofs.ts (predicates)"]
        APP -->|"NL policy text"| API1["POST /api/policy (server)"]
        API1 --> QW["Qwen (OpenAI-compatible)<br/>optional"]
        API1 -.->|"no key / failure"| LP["Deterministic local<br/>rule parser"]
        QW -->|"requirement ids"| VAL["Closed-vocabulary<br/>validation (policy.ts)"]
        LP --> VAL
        VAL -->|"structured policy"| PE
        PE -->|"nova:credential: / nova:attestation:<br/>domain-separated commitments"| CR["circuit bindings<br/>crypto.ts"]
    end

    subgraph Tooling["Server-side Compact tooling (scripts/)"]
        TOOL["deploy-ledger.ts<br/>provider stack + witness execution"]
        PS["Proof server (local Docker, :6300)<br/>ZK proof generation"]
        TOOL -->|"witness inputs + zkir"| PS
        TOOL -.->|"same circuit semantics,<br/>real persistentHash"| CR
        PS -->|"proof + unbound tx"| WP["Wallet provider<br/>balanceTx / submitTx"]
    end

    subgraph Chain["Midnight Preprod"]
        NODE["Midnight node<br/>rpc.preprod.midnight.network"]
        NODE --> BC["NØVA Compact Contract<br/>contract/src/nova.compact<br/>(commitments + aggregates only)"]
        BC --> IDX["Indexer (GraphQL v4)<br/>indexer.preprod.midnight.network"]
    end

    subgraph Verifier["Verifier"]
        VD["Verifier dashboard<br/>/dashboard/requests"]
        VR["Result page /verify/:id<br/>VerifyResult.tsx"]
    end

    IDX -->|"GET /api/ledger/state<br/>(aggregates + last attestation)"| VR
    IDX -->|"GET /api/ledger/state"| VD
    BC -.->|"personal attributes<br/>NEVER LEAVE DEVICE ✕"| X(( ))

    style VLT fill:#15151f,stroke:#8b86fa,color:#f5f5f8
    style BC fill:#15151f,stroke:#8b86fa,color:#f5f5f8
    style X fill:#15151f,stroke:#ff7a7a,color:#ff7a7a
```

## Layers (code mapping)

```
UI            src/app, src/components        — renders states, never touches chain APIs directly
              (landing, dashboard, /grant, /demo, /verify/[id], /developers)

Application   src/lib/requests.ts            — verification request repository + activity log
service       src/lib/policy/*               — NL → requirement ids (Qwen/local, validated)
              src/lib/store.ts               — zustand: wallet session, toasts, invalidation

Midnight      src/lib/midnight/network.ts    — mode ('ledger' | 'simulation'), endpoints
service layer src/lib/midnight/wallet.ts     — DApp Connector detection + connectWallet()
              src/lib/midnight/credentials.ts— encrypted vault: issueCredential(), getPrivateCredentials()
              src/lib/midnight/proofs.ts     — generateProof(), verifyProof(), predicates
              src/lib/midnight/contracts.ts  — circuit/ledger metadata + contract-id validation
              src/app/api/ledger/state/      — server route: indexer read of public state
              src/lib/midnight/crypto.ts     — commitments mirroring nova.compact domain separation

Contract      contract/src/nova.compact      — Compact 0.23 → compiled circuits/ZKIR (src/managed/nova)
              scripts/deploy-ledger.ts       — provider stack, deployContract, test interactions
```

## Trust boundaries

| Boundary | What crosses it | What never crosses it |
| --- | --- | --- |
| Vault → proof engine | attribute plaintext (same device, decrypted locally) | — |
| Holder → Midnight | one-way commitments, accumulator folds, attestation fingerprints, aggregate counters | names, DOB, student IDs, region codes, reputation inputs |
| Qwen → NØVA | requirement ids (untrusted, validated) | authority over verification |
| NØVA servers → anyone | no user data exists server-side | — |
