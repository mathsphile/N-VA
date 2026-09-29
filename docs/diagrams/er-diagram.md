# NØVA — Data Model (ER)

Generated from the actual types in `src/lib/midnight/types.ts`,
`src/lib/requests.ts` and `src/lib/policy/policy.ts`. There is no server-side
database: everything below lives either in the holder's encrypted browser
storage or on-chain.

```mermaid
erDiagram
    PRIVATE_CREDENTIAL {
        string id PK "cred_… (local)"
        enum kind "student|age|region|developer|hackathon|university|employment|grant"
        string label
        string issuer "org that vouched"
        bytes commitment "U64 — sha256/persistentHash(nova:credential:, issuerPub, secret)"
        datetime issuedAt
        enum status "verified|pending|revoked"
    }

    CREDENTIAL_ATTRIBUTES {
        int age "sealed in vault ciphertext"
        string regionCode "sealed"
        bool isStudent "sealed"
        bool isDeveloper "sealed"
        int reputation "sealed"
        int verifiedProjects "sealed"
        int hackathons "sealed"
        bool isEmployed "sealed"
        bool grantReceived "sealed"
        string note "sealed"
    }

    PROOF_REQUEST {
        string id PK "req_… — localStorage: nova.requests.v1 + 2 built-ins"
        string name
        string organization
        string description
        RequirementId_array requirements "FK → REQUIREMENT catalog (11 ids)"
        string campaign "uniqueness scope — campaign:… "
        datetime createdAt
        enum status "open|fulfilled|expired"
        enum mode "ledger|simulation"
    }

    REQUIREMENT {
        RequirementId id PK "student, age_18, region_eligible, unique_applicant, developer, hackathon_participant, employment_verified, grant_eligible, reputation_gt_750, projects_gte_3, hackathons_gte_5"
        string label
        string attribute "predicate name — never the value"
    }

    PRIVATE_PROOF {
        string id PK "proof_… — localStorage: nova.proofs.v1 (cap 100)"
        string requestId FK
        bool commitmentsRevealed "always false — type literal"
        bytes attestation "U64 — nova:attestation:(joined commitments, campaign, entropy)"
        datetime generatedAt
        enum mode "ledger|simulation"
        string attestedBy "contract id | 'NØVA local proof engine'"
    }

    PROOF_CLAIM {
        RequirementId requirement FK
        string label
        bool satisfied
    }

    VERIFICATION_RESULT {
        string proofId FK
        string requestName
        string organization
        bool verified
        datetime verifiedAt
        enum source "midnight-ledger|local-proof-engine"
    }

    ACTIVITY_ITEM {
        string id PK "act_… — localStorage: nova.activity.v1 (cap 200)"
        enum kind "credential|proof|verification|issuance"
        string label
        string status
        datetime at
    }

    WALLET_SESSION {
        string providerName "sessionStorage: nova.wallet — never localStorage"
        enum api "v4|legacy"
        string address "unshielded bech32 (nullable)"
        string publicKey "coin public key (nullable)"
    }

    ATTESTED_SCOPE {
        string campaign PK "localStorage: nova.attested.v1 — anti-sybil guard"
    }

    VAULT_CONTAINER {
        bytes iv "AES-GCM, key = PBKDF2(device root, 210k, SHA-256)"
        bytes ciphertext "JSON array of PRIVATE_CREDENTIAL"
    }

    CONTRACT_STATE_LEDGER {
        enum status "Bootstrapping|Live|Suspended"
        bytes owner "operator pk"
        bigint sequence
        bytes credentialAccumulator "fold of all commitments"
        bigint credentialCount
        bigint proofCount
        bytes lastAttestation
        bytes lastAttestationScope
    }

    PRIVATE_CREDENTIAL ||--|{ CREDENTIAL_ATTRIBUTES : "sealed inside (AES-GCM)"
    PRIVATE_CREDENTIAL }o--|| VAULT_CONTAINER : "serialized into"
    PROOF_REQUEST }o--|{ REQUIREMENT : "requires"
    PRIVATE_PROOF }o--|| PROOF_REQUEST : "answers"
    PRIVATE_PROOF ||--|{ PROOF_CLAIM : "asserts"
    PROOF_CLAIM }o--|| REQUIREMENT : "maps to"
    PRIVATE_PROOF }o--o| PRIVATE_CREDENTIAL : "commits (never reveals)"
    PRIVATE_PROOF }o--|| ATTESTED_SCOPE : "consumes (unique_applicant)"
    VERIFICATION_RESULT }o--|| PRIVATE_PROOF : "verifies"
    VERIFICATION_RESULT }o--|| PROOF_REQUEST : "for"
    WALLET_SESSION ||--o| PRIVATE_PROOF : "binds ledger mode"
    CONTRACT_STATE_LEDGER ||--o{ PRIVATE_PROOF : "attested on (Nova.attest)"
```

## Persistence map (all device-local)

| Storage key | Owner module | Contents |
| --- | --- | --- |
| `nova.device.root.v1` | credentials.ts | 32-byte device key (PBKDF2 input) |
| `nova.vault.v1` | credentials.ts | encrypted vault container |
| `nova.requests.v1` | requests.ts | org-created requests |
| `nova.proofs.v1` | proofs.ts | generated proofs |
| `nova.attested.v1` | proofs.ts | consumed uniqueness scopes |
| `nova.activity.v1` | requests.ts | local audit trail |
| `nova.wallet` (sessionStorage) | store.ts | wallet session, cleared per tab |
| `nova-private-state-preprod` (LevelDB) | deploy-ledger.ts | circuit witnesses (server/deploy side) |

## Contract-side model (public state only)

Compact `ledger` declarations in `nova.compact`: `status`, `owner`, `sequence`,
`credentialAccumulator`, `credentialCount`, `proofCount`, `lastAttestation`,
`lastAttestationScope`. `witness` inputs (`localAdminSecretKey`,
`credentialSecret`, `holderEntropy`) exist only in private state — the ER model
above shows their client-side shape, never a server-side column.
