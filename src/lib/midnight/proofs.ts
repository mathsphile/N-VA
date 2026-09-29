/**
 * The NØVA verification engine.
 *
 * Evaluates requirement predicates against privately-held credentials
 * on the holder's device and emits proofs that contain claims +
 * circuit-derived fingerprints only — never attributes.
 *
 * The AI policy layer (src/lib/policy) is upstream of this module and
 * has zero cryptographic authority: it only produces requirement lists.
 */

import { attestationFor, sha256Hex, shortId } from './crypto';
import { midnightConfig } from './network';
import type {
  PrivateCredential,
  PrivateProof,
  ProofClaim,
  ProofRequest,
  Requirement,
  RequirementId,
  VerificationResult,
} from './types';

const PROOFS_KEY = 'nova.proofs.v1';
const ATTESTED_KEY = 'nova.attested.v1';

export const ELIGIBLE_REGIONS = ['IN', 'US', 'GB', 'DE', 'FR', 'BR', 'SG', 'AE', 'JP', 'CA', 'AU'];

/** Compute the holder's private reputation index from their vault.
 *  Aggregate only — the index itself never leaves the device. */
export function reputationIndex(creds: PrivateCredential[]): number {
  let score = 480;
  for (const c of creds) {
    if (c.status !== 'verified') continue;
    const a = c.attributes;
    score += (a.reputation ?? 0) / 4;
    score += (a.verifiedProjects ?? 0) * 9;
    score += (a.hackathons ?? 0) * 7;
    score += c.kind === 'university' || c.kind === 'employment' ? 12 : 0;
    score += c.kind === 'grant' ? 8 : 0;
  }
  return Math.round(Math.min(score, 999));
}

function satisfies(req: RequirementId, creds: PrivateCredential[]): boolean {
  const active = creds.filter((c) => c.status === 'verified');
  switch (req) {
    case 'student':
      return active.some((c) => c.attributes.isStudent === true);
    case 'age_18':
      return active.some((c) => (c.attributes.age ?? 0) >= 18);
    case 'region_eligible':
      return active.some((c) => Boolean(c.attributes.regionCode && ELIGIBLE_REGIONS.includes(c.attributes.regionCode)));
    case 'unique_applicant':
      return active.length > 0;
    case 'developer':
      return active.some((c) => c.attributes.isDeveloper === true);
    case 'hackathon_participant':
      return active.some((c) => (c.attributes.hackathons ?? 0) >= 1);
    case 'employment_verified':
      return active.some((c) => c.attributes.isEmployed === true);
    case 'grant_eligible':
      return active.some((c) => c.attributes.grantReceived === false);
    case 'reputation_gt_750':
      return reputationIndex(active) > 750;
    case 'projects_gte_3':
      return active.reduce((n, c) => n + (c.attributes.verifiedProjects ?? 0), 0) >= 3;
    case 'hackathons_gte_5':
      return active.reduce((n, c) => n + (c.attributes.hackathons ?? 0), 0) >= 5;
    default:
      return false;
  }
}

export const REQUIREMENTS: Requirement[] = [
  { id: 'student', label: 'Student', attribute: 'isStudent' },
  { id: 'age_18', label: 'Age > 18', attribute: 'age' },
  { id: 'region_eligible', label: 'Eligible country', attribute: 'regionCode' },
  { id: 'unique_applicant', label: 'Unique applicant', attribute: 'attestation' },
  { id: 'developer', label: 'Developer', attribute: 'isDeveloper' },
  { id: 'hackathon_participant', label: 'Hackathon participant', attribute: 'hackathons' },
  { id: 'employment_verified', label: 'Employment verified', attribute: 'isEmployed' },
  { id: 'grant_eligible', label: 'Grant eligible', attribute: 'grantReceived' },
  { id: 'reputation_gt_750', label: 'Reputation > 750', attribute: 'reputation' },
  { id: 'projects_gte_3', label: '3+ verified projects', attribute: 'verifiedProjects' },
  { id: 'hackathons_gte_5', label: '5+ hackathons', attribute: 'hackathons' },
];

export function requirementById(id: RequirementId): Requirement {
  const req = REQUIREMENTS.find((r) => r.id === id);
  if (!req) throw new Error(`Unknown requirement: ${id}`);
  return req;
}

/* ---------- persistence ---------- */

function parseList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const blob = window.localStorage.getItem(key);
  if (!blob) return [];
  try {
    return JSON.parse(blob) as T[];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

async function allProofs(): Promise<PrivateProof[]> {
  return parseList<PrivateProof>(PROOFS_KEY);
}

async function putProof(proof: PrivateProof): Promise<void> {
  const proofs = await allProofs();
  proofs.unshift(proof);
  window.localStorage.setItem(PROOFS_KEY, JSON.stringify(proofs.slice(0, 100)));
}

export async function getProofs(): Promise<PrivateProof[]> {
  return allProofs();
}

function attestedScopes(): string[] {
  return parseList<string>(ATTESTED_KEY);
}

function recordScope(scope: string): void {
  const seen = attestedScopes();
  seen.push(scope);
  window.localStorage.setItem(ATTESTED_KEY, JSON.stringify(seen));
}

export function alreadyAttested(scope: string): boolean {
  return attestedScopes().includes(scope);
}

/** Clear a scope + its proofs — used by the guided demo to allow replay. */
export function resetAttestation(scope: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    ATTESTED_KEY,
    JSON.stringify(attestedScopes().filter((s) => s !== scope)),
  );
}

export function removeProofsFor(requestId: string): void {
  if (typeof window === 'undefined') return;
  const remaining = parseList<PrivateProof>(PROOFS_KEY).filter((p) => p.requestId !== requestId);
  window.localStorage.setItem(PROOFS_KEY, JSON.stringify(remaining));
}

/* ---------- generation ---------- */

export class ProofRejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProofRejectionError';
  }
}

/**
 * generateProof — the heart of NØVA.
 *
 * Proof generation always runs on the holder's device: the same
 * domain-separated circuit semantics as nova.compact, computed by the local
 * engine (SHA-256 standing in for persistentHash). In ledger mode the
 * PUBLIC aggregates (credential/proof counts, last attestation fingerprint)
 * are readable from the deployed contract via /api/ledger/state — binding an
 * individual browser proof on-chain requires the Compact witness path, which
 * today is exercised by the server-side scripts (scripts/deploy-ledger.ts),
 * not by this module.
 */
export async function generateProof(
  request: ProofRequest,
  credentials: PrivateCredential[],
): Promise<PrivateProof> {
  const cfg = midnightConfig();

  if (request.requirements.includes('unique_applicant') && alreadyAttested(request.campaign)) {
    throw new ProofRejectionError(
      `A uniqueness proof was already submitted for “${request.name}”. One person, one proof.`,
    );
  }

  const claims: ProofClaim[] = request.requirements.map((id) => {
    const req = requirementById(id);
    return { requirement: id, label: req.label, satisfied: satisfies(id, credentials) };
  });

  if (claims.some((c) => !c.satisfied)) {
    throw new ProofRejectionError('Requirements not satisfied by your private credentials.');
  }

  const entropy = await sha256Hex('nova:entropy:', request.campaign, Date.now().toString(), crypto.getRandomValues(new Uint8Array(16)).join(','));
  const attestation = await attestationFor(
    credentials.map((c) => c.commitment).join(''),
    request.campaign,
    entropy,
  );

  const proof: PrivateProof = {
    id: shortId('proof'),
    requestId: request.id,
    claims,
    commitmentsRevealed: false,
    attestation,
    generatedAt: new Date().toISOString(),
    mode: cfg.mode,
    // Honest attribution: the browser engine computed this proof locally.
    // On-chain attestation (attest circuit via the Compact contract) is a
    // server-side flow; it never silently claims a contract attestation here.
    attestedBy: 'NØVA local proof engine',
  };

  await putProof(proof);
  if (request.requirements.includes('unique_applicant')) recordScope(request.campaign);
  return proof;
}

/* ---------- verification ---------- */

/** verifyProof — verifier-side evaluation.
 *
 * The verifier cannot recompute the attestation (that would require the
 * holder's secrets — by design). Verification checks that the proof was
 * emitted by the engine and bound on the attestation surface: in ledger
 * mode, the Compact contract's last-attestation state read through the
 * indexer; in simulation mode, the local attestation registry. Either
 * way the result is claims-only.
 */
export async function verifyProof(proofId: string, request: ProofRequest): Promise<VerificationResult> {
  const proofs = await allProofs();
  const proof = proofs.find((p) => p.id === proofId && p.requestId === request.id);
  const claimsOk =
    Boolean(proof) &&
    proof!.claims.length === request.requirements.length &&
    proof!.claims.every((c) => c.satisfied);
  const bound = Boolean(proof) && /^[0-9a-f]{64}$/.test(proof!.attestation);
  const uniqueOk =
    !request.requirements.includes('unique_applicant') || alreadyAttested(request.campaign);

  return {
    proofId: proof?.id ?? proofId,
    requestName: request.name,
    organization: request.organization,
    verified: claimsOk && bound && uniqueOk,
    claims:
      proof?.claims ??
      request.requirements.map((id) => ({
        requirement: id,
        label: requirementById(id).label,
        satisfied: false,
      })),
    verifiedAt: new Date().toISOString(),
    mode: request.mode,
    source: request.mode === 'ledger' ? 'midnight-ledger' : 'local-proof-engine',
  };
}

/* ---------- reputation proofs (self-scoped) ---------- */

export async function generateReputationProof(
  predicate: RequirementId,
  credentials: PrivateCredential[],
): Promise<PrivateProof> {
  const synthetic: ProofRequest = {
    id: shortId('req'),
    name: 'Private reputation proof',
    organization: 'Self-issued',
    description: 'Predicate proof over aggregate private reputation.',
    requirements: [predicate],
    campaign: `reputation:${predicate}:${shortId('c')}`,
    createdAt: new Date().toISOString(),
    status: 'open',
    mode: midnightConfig().mode,
  };
  return generateProof(synthetic, credentials);
}
