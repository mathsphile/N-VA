# NØVA — Application Diagram (end-to-end)

```mermaid
flowchart LR
    subgraph Client["Browser"]
        direction TB
        L["Landing<br/>src/app/page.tsx"]
        D["Dashboard<br/>/dashboard/*"]
        G["Grant application<br/>/grant?request=…"]
        DM["Guided demo<br/>/demo"]
        V["Verifier result<br/>/verify/[requestId]"]
        DEV["Docs<br/>/developers"]
        S["Zustand store<br/>wallet · toasts · versions"]
        LD["Midnight service layer<br/>wallet · credentials · proofs · network"]
        L --- S
        D --- S
        G --- S
        DM --- S
        V --- S
        S --- LD
    end

    subgraph Server["NØVA server (Next.js runtime + scripts)"]
        R["POST /api/policy"]
        LS["GET /api/ledger/state"]
        DL["scripts/deploy-ledger.ts<br/>(midnight-js providers)"]
        ENV[".env.local<br/>seed · contract id · mode"]
    end

    subgraph External["External services"]
        Q["Qwen API<br/>(optional, env-gated)"]
        PS["Proof server :6300<br/>Docker · local"]
        RPC["Midnight node<br/>rpc.preprod.midnight.network"]
        IX["Indexer<br/>indexer.preprod.midnight.network"]
        CT[("NØVA Compact contract<br/>Nova: commitments + counters")]
    end

    R -->|"NL → ids"| Q
    R -->|"fallback"| R2["local rule parser"]
    DL -->|"prove (witness + zkir)"| PS
    PS -->|"ZK proof"| DL
    DL -->|"submitDeployTx / callTx"| RPC
    LD -->|"fetch"| LS
    LS -->|"queryContractState"| IX
    IX --> CT
    RPC <--> CT
    ENV -.->|"NEXT_PUBLIC_* inlined<br/>MIDNIGHT_WALLET_SEED server-only"| Client
```

## Route map

| Route | Purpose | Data touched |
| --- | --- | --- |
| `/` | marketing + live interactive proof | vault (read), proofs (write) |
| `/dashboard` | overview: stats, requests, activity | vault, proofs, requests |
| `/dashboard/credentials` | vault: issue / prove / seal | vault (CR) |
| `/dashboard/proofs` | generated proofs, verifier view | proofs (R) |
| `/dashboard/reputation` | predicate proofs over aggregates | vault (R), proofs (W) |
| `/dashboard/requests` | verifier: create + check results | requests (CR), proofs (R) |
| `/dashboard/activity` | local audit trail | activity (R) |
| `/dashboard/settings` | mode, wallet, custody, destroy | env, vault |
| `/demo` | guided applicant ↔ verifier scenario | vault, proofs |
| `/grant` | shareable private application | requests (R), proofs (W) |
| `/verify/[id]` | claims-only verification result | proofs (R) |
| `/developers` | integration docs | none |
| `POST /api/policy` | NL → requirement ids | none persisted |
