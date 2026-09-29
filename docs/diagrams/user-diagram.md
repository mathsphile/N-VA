# NØVA — Actors & Users

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

| Actor | Primary jobs | Auth surface |
| --- | --- | --- |
| Holder | unlock vault, review requests, generate + submit private proofs | device key (+ wallet for ledger mode) |
| Organization | define requirement sets (checkboxes or NL policy), share `/grant?request=…` links, view results | none — claims are public to the holder |
| Developer | compile `nova.compact`, deploy via providers, integrate SDK | `MIDNIGHT_WALLET_SEED` (server-side only) |
| Midnight wallet | sign transactions, expose accounts | extension |
| Qwen | classify free text → requirement ids | `QWEN_API_KEY` (optional) |
