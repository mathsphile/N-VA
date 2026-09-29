/**
 * NØVA domain model — shared types for the Midnight service layer,
 * application services and UI.
 *
 * Product principle: the verifier receives claims (booleans) and proof
 * fingerprints only. Raw attributes never cross this boundary.
 */

export type MidnightMode = 'ledger' | 'simulation';

/* ---------- requirements & credentials ---------- */

export type RequirementId =
  | 'student'
  | 'age_18'
  | 'region_eligible'
  | 'unique_applicant'
  | 'developer'
  | 'hackathon_participant'
  | 'employment_verified'
  | 'grant_eligible'
  | 'reputation_gt_750'
  | 'projects_gte_3'
  | 'hackathons_gte_5';

export interface Requirement {
  id: RequirementId;
  label: string;
  /** Credential attribute this requirement checks, never revealed. */
  attribute: string;
}

export type CredentialKind =
  | 'student'
  | 'developer'
  | 'age'
  | 'region'
  | 'hackathon'
  | 'university'
  | 'employment'
  | 'grant';

export interface PrivateCredential {
  id: string;
  kind: CredentialKind;
  label: string;
  issuer: string;
  /** 32-byte domain-separated commitment (what a ledger would see). */
  commitment: string;
  issuedAt: string;
  status: 'verified' | 'pending' | 'revoked';
  /**
   * Encrypted private attributes. Decrypted only inside the proof
   * engine on the holder's device — never sent anywhere.
   */
  attributes: CredentialAttributes;
}

export interface CredentialAttributes {
  age?: number;
  regionCode?: string;
  isStudent?: boolean;
  isDeveloper?: boolean;
  reputation?: number;
  verifiedProjects?: number;
  hackathons?: number;
  isEmployed?: boolean;
  grantReceived?: boolean;
  note?: string;
}

/* ---------- proof requests ---------- */

export interface ProofRequest {
  id: string;
  name: string;
  organization: string;
  description: string;
  requirements: RequirementId[];
  /** Scope binding for uniqueness proofs (anti-sybil domain). */
  campaign: string;
  createdAt: string;
  status: 'open' | 'fulfilled' | 'expired';
  mode: MidnightMode;
}

/* ---------- proofs ---------- */

export interface ProofClaim {
  requirement: RequirementId;
  label: string;
  satisfied: boolean;
}

export interface PrivateProof {
  id: string;
  requestId: string;
  claims: ProofClaim[];
  /** Binding to the holder's credential commitments. */
  commitmentsRevealed: false;
  /** Scope-bound uniqueness fingerprint — reveals no identity. */
  attestation: string;
  generatedAt: string;
  mode: MidnightMode;
  /** Human-readable attestation path, e.g. "local proof engine" or
   *  the contract id under which the circuit executed. */
  attestedBy: string;
}

export interface VerificationResult {
  proofId: string;
  requestName: string;
  organization: string;
  verified: boolean;
  claims: ProofClaim[];
  verifiedAt: string;
  mode: MidnightMode;
  /** Explicit honesty flag surfaced in the UI. */
  source: 'midnight-ledger' | 'local-proof-engine';
}

/* ---------- activity / misc ---------- */

export type ActivityKind = 'credential' | 'proof' | 'verification' | 'issuance';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  label: string;
  status: string;
  at: string;
}
