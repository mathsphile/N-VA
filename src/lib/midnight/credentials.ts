/**
 * Private Credential Vault.
 *
 * Credentials live ONLY on the holder's device, encrypted at rest with
 * AES-GCM under a device root key (PBKDF2-derived). The vault never
 * leaves the browser. Only one-way commitments would ever reach a
 * ledger (see proofs.ts / contracts.ts).
 *
 * NØVA has no user database. This is deliberate: minimize data, keep
 * data private, generate proof, verify claim, reveal minimum.
 */

import type { CredentialAttributes, CredentialKind, PrivateCredential } from './types';
import {
  credentialCommitment,
  deriveCredentialSecret,
  issuerPublicKey,
  randomHex,
  shortId,
  toHex,
} from './crypto';

const ROOT_KEY = 'nova.device.root.v1';
const VAULT_KEY = 'nova.vault.v1';

/* ---------------- device key management ---------------- */

function getOrCreateRootSecret(): string {
  if (typeof window === 'undefined') throw new Error('vault: browser-only');
  let root = window.localStorage.getItem(ROOT_KEY);
  if (!root) {
    root = randomHex(32);
    window.localStorage.setItem(ROOT_KEY, root);
  }
  return root;
}

async function vaultKey(): Promise<CryptoKey> {
  const root = getOrCreateRootSecret();
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(root), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('nova:vault:preprod'),
      iterations: 210_000,
      hash: 'SHA-256',
    },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptJson(value: unknown): Promise<string> {
  const key = await vaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return JSON.stringify({ iv: toHex(iv), ct: toHex(new Uint8Array(ct)) });
}

async function decryptJson<T>(blob: string): Promise<T> {
  const key = await vaultKey();
  const { iv, ct } = JSON.parse(blob) as { iv: string; ct: string };
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(iv) },
    key,
    hexToBytes(ct),
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

function hexToBytes(hexStr: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hexStr.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/* ---------------- vault API ---------------- */

async function loadRaw(): Promise<PrivateCredential[]> {
  if (typeof window === 'undefined') return [];
  const blob = window.localStorage.getItem(VAULT_KEY);
  if (!blob) return [];
  try {
    return await decryptJson<PrivateCredential[]>(blob);
  } catch {
    // Corrupt vault — fail closed rather than silently wiping.
    throw new Error('Vault could not be decrypted on this device.');
  }
}

async function saveRaw(creds: PrivateCredential[]): Promise<void> {
  window.localStorage.setItem(VAULT_KEY, await encryptJson(creds));
}

/** All credentials held by this device. Attributes decrypted locally. */
export async function getPrivateCredentials(): Promise<PrivateCredential[]> {
  return loadRaw();
}

export async function clearVault(): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(VAULT_KEY);
}

/**
 * Issue a credential. In simulation mode the issuer runs locally with
 * realistic latency; on a configured ledger the same commitment is what
 * `registerCredential()` would fold into the accumulator.
 */
export async function issueCredential(input: {
  kind: CredentialKind;
  label: string;
  issuer: string;
  attributes: CredentialAttributes;
}): Promise<PrivateCredential> {
  const root = getOrCreateRootSecret();
  const secret = await deriveCredentialSecret(root, `${input.kind}:${input.issuer}`);
  const issuerPub = await issuerPublicKey(input.issuer);
  const credential: PrivateCredential = {
    id: shortId('cred'),
    kind: input.kind,
    label: input.label,
    issuer: input.issuer,
    commitment: await credentialCommitment(secret, issuerPub),
    issuedAt: new Date().toISOString(),
    status: 'verified',
    attributes: input.attributes,
  };
  const creds = await loadRaw();
  creds.push(credential);
  await saveRaw(creds);
  return credential;
}

export async function revokeCredential(id: string): Promise<void> {
  const creds = await loadRaw();
  const cred = creds.find((c) => c.id === id);
  if (!cred) return;
  cred.status = 'revoked';
  await saveRaw(creds);
}

/* ---------------- demo seed ---------------- */

interface SeedSpec {
  kind: CredentialKind;
  label: string;
  issuer: string;
  attributes: CredentialAttributes;
}

const DEMO_SEED: SeedSpec[] = [
  { kind: 'student', label: 'Student', issuer: 'FIEM', attributes: { isStudent: true, note: 'Enrolled, current term' } },
  { kind: 'age', label: 'Age > 18', issuer: 'FIEM Registrar', attributes: { age: 21 } },
  { kind: 'region', label: 'Country Eligible', issuer: 'NØVA Region Oracle', attributes: { regionCode: 'IN' } },
  { kind: 'developer', label: 'Developer', issuer: 'Midnight Dev Guild', attributes: { isDeveloper: true, verifiedProjects: 8 } },
  { kind: 'hackathon', label: 'Hackathon Participant', issuer: 'HackSpire', attributes: { hackathons: 12 } },
  { kind: 'university', label: 'University Verified', issuer: 'FIEM', attributes: { note: 'Institutional verification' } },
  { kind: 'employment', label: 'Employment Verified', issuer: 'Talent Registry', attributes: { isEmployed: false } },
  { kind: 'grant', label: 'Grant Eligible', issuer: 'Public Goods Fund', attributes: { grantReceived: false } },
];

/** Populate the vault with a realistic starter set (idempotent). */
export async function seedDemoVault(): Promise<PrivateCredential[]> {
  const existing = await loadRaw();
  if (existing.length > 0) return existing;
  for (const spec of DEMO_SEED) {
    await issueCredential(spec);
  }
  return loadRaw();
}
