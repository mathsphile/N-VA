/**
 * Cryptographic primitives for the local proof engine.
 *
 * Commitment schemes mirror the domain separation of nova.compact
 * (`nova:credential:`, `nova:accumulator:`, `nova:attestation:`).
 * Off-ledger we approximate Compact's `persistentHash` with SHA-256 —
 * the simulation makes no claim of ZK circuit proofs and the UI labels
 * it accordingly. On the ledger path the circuits themselves run.
 */

const encoder = new TextEncoder();

export async function sha256Hex(...parts: Array<string | Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = parts.map((p) =>
    typeof p === 'string' ? encoder.encode(p) : p,
  );
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return toHex(new Uint8Array(digest));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomHex(byteLength: number): string {
  const b = crypto.getRandomValues(new Uint8Array(byteLength));
  return toHex(b);
}

export function shortId(prefix: string): string {
  return `${prefix}_${randomHex(6)}`;
}

/* ---- circuit-equivalent derivations (simulation of nova.compact) ---- */

export async function credentialCommitment(secret: string, issuerPub: string): Promise<string> {
  return sha256Hex('nova:credential:', issuerPub, secret);
}

export async function accumulatorNext(accumulator: string, commitment: string): Promise<string> {
  return sha256Hex('nova:accumulator:', accumulator, commitment);
}

export async function attestationFor(
  secret: string,
  scope: string,
  entropy: string,
): Promise<string> {
  return sha256Hex('nova:attestation:', secret, scope, entropy);
}

/** Deterministic per-holder secret derived from the root device secret
 *  + credential kind, so a credential's commitment is stable across
 *  sessions without storing the secret in plaintext. */
export async function deriveCredentialSecret(rootSecret: string, kind: string): Promise<string> {
  return sha256Hex('nova:secret:', rootSecret, kind);
}

/** Public issuer identity used by the demo issuers (commitment of the
 *  issuer name — stands in for the issuer's ledger public key). */
export async function issuerPublicKey(issuerName: string): Promise<string> {
  return sha256Hex('nova:issuer:', issuerName);
}
