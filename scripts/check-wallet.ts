/*
 * NØVA — deployment wallet health check (read-only).
 *
 * Reports the preprod unshielded address, tNIGHT balance, DUST balance and
 * how many UTXOs are already registered for tDUST generation. Nothing is
 * signed away or submitted.
 *
 *   MIDNIGHT_WALLET_SEED=<64-hex> npx tsx scripts/check-wallet.ts [preprod|preview]
 */

import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { pino } from 'pino';
import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { WebSocket } from 'ws';
import { NovaWalletProvider } from './lib/wallet-provider.js';
import { loadEnvFiles } from './lib/env.js';

// @ts-expect-error — WebSocket polyfill for the indexer client on Node
globalThis.WebSocket = WebSocket;

const ENDPOINTS: Record<string, EnvironmentConfiguration> = {
  preprod: {
    walletNetworkId: 'preprod',
    networkId: 'preprod',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    nodeWS: 'wss://rpc.preprod.midnight.network',
    faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
    proofServer: process.env.PROOF_SERVER_URL ?? 'http://localhost:6300',
  },
  preview: {
    walletNetworkId: 'preview',
    networkId: 'preview',
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preview.midnight.network',
    nodeWS: 'wss://rpc.preview.midnight.network',
    faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
    proofServer: process.env.PROOF_SERVER_URL ?? 'http://localhost:6300',
  },
};

const logger = pino({ level: 'error' });

async function main(): Promise<void> {
  const network = process.argv[2] ?? 'preprod';
  const env = ENDPOINTS[network];
  if (!env) throw new Error(`unknown network ${network}`);
  setNetworkId(network as 'preprod' | 'preview');
  loadEnvFiles();
  const seed = process.env[`MIDNIGHT_${network.toUpperCase()}_SEED`] ?? process.env.MIDNIGHT_WALLET_SEED;
  if (!seed) throw new Error(`MIDNIGHT_${network.toUpperCase()}_SEED (or MIDNIGHT_WALLET_SEED) not set`);

  const provider = await NovaWalletProvider.build(logger, env, seed);
  await provider.start();
  try {
    const wallet = provider.wallet;
    const unshielded = await firstValueFrom(wallet.unshielded.state);
    const address = UnshieldedAddress.codec.encode(getNetworkId(), unshielded.address).toString();
    const token = unshieldedToken();
    const balance = unshielded.balances[token.raw] ?? 0n;
    const registered = unshielded.availableCoins.filter((c) => c.meta.registeredForDustGeneration).length;
    const unregistered = unshielded.availableCoins.length - registered;
    console.log(`network        : ${network}`);
    console.log(`unshielded     : ${address}`);
    console.log(`tNIGHT balance : ${balance}`);
    console.log(`utxos          : ${registered} registered / ${unregistered} unregistered for tDUST`);
    const dust = await firstValueFrom(
      wallet.state().pipe(Rx.map((st) => st.dust.balance(new Date())), Rx.timeout(20_000)),
    );
    console.log(`tDUST balance  : ${dust}`);
  } finally {
    await provider.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
