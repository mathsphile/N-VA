/*
 * NØVA — dedicated deployment wallet initialization (offline, read-only net).
 *
 * Generates (once) a 64-hex master seed via the Midnight wallet SDK path used
 * by the deploy scripts, persists it to the git-ignored .env.local under
 * MIDNIGHT_<NETWORK>_SEED, and prints ONLY the public unshielded address.
 * Re-running is idempotent: the stored seed is reused, never regenerated.
 *
 *   npx tsx scripts/init-deploy-wallet.ts [preview|preprod]
 *
 * The seed itself is never printed, logged, or written anywhere else.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore, PublicKey } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { loadEnvFiles } from './lib/env.js';

const SEED_RE = /^[0-9a-fA-F]{64}$/;

function upsertEnvVar(envPath: string, name: string, value: string): void {
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const re = new RegExp(`^${name}=.*$`, 'm');
  const line = `${name}=${value}`;
  text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}${text.trim() ? '\n' : ''}${line}\n`;
  fs.writeFileSync(envPath, text.trimStart(), { mode: 0o600 });
  fs.chmodSync(envPath, 0o600);
}

function deriveUnshieldedAddress(seed: string, network: string): string {
  const result = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (result.type !== 'seedOk') throw new Error('Invalid seed: failed to create HD wallet');
  const derived = result.hdWallet.selectAccount(0).selectRole(Roles.NightExternal).deriveKeyAt(0);
  if (derived.type === 'keyOutOfBounds') throw new Error('Key derivation out of bounds');

  const keystore = createKeystore(derived.key, network);
  const bech32 = keystore.getBech32Address().toString();

  // Cross-check against the address-format codec — both paths must agree.
  const pub = PublicKey.fromKeyStore(keystore);
  const codecAddress = UnshieldedAddress.codec
    .encode(network, new UnshieldedAddress(Buffer.from(pub.addressHex, 'hex')))
    .toString();
  if (bech32 !== codecAddress) {
    throw new Error(`Address derivation mismatch between keystore (${bech32}) and codec (${codecAddress})`);
  }
  return bech32;
}

async function main(): Promise<void> {
  const network = (process.argv[2] ?? 'preview').toLowerCase();
  if (!['preview', 'preprod', 'undeployed'].includes(network)) {
    throw new Error(`unsupported network: ${network}`);
  }
  const varName = `MIDNIGHT_${network.toUpperCase()}_SEED`;

  loadEnvFiles();
  const envPath = path.resolve(process.cwd(), '.env.local');

  let seed = process.env[varName];
  let created = false;
  if (!seed) {
    seed = crypto.randomBytes(32).toString('hex');
    upsertEnvVar(envPath, varName, seed);
    created = true;
  } else if (!SEED_RE.test(seed)) {
    throw new Error(`${varName} exists but is not a 64-hex seed — refusing to use or overwrite it.`);
  }

  // Verify the seed is a valid wallet seed through the SDK before printing anything.
  const address = deriveUnshieldedAddress(seed, network);
  const prefix = network === 'mainnet' ? 'mn_addr1' : `mn_addr_${network}1`;
  if (!address.startsWith(prefix)) throw new Error(`Derived address ${address} does not match ${prefix} format`);

  console.log('NØVA Midnight deployment wallet');
  console.log(`network : ${network}`);
  console.log(`seed    : ${created ? 'generated' : 'reused'} (stored as ${varName} in .env.local — git-ignored, not printed)`);
  console.log(`address : ${address}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
