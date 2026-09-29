/*
 * NØVA — resume a partially-finished Preview deployment.
 *
 * The contract at the given address is already published on Midnight Preview
 * (deploy tx e99195b8...); this script attaches with the existing private
 * state, runs the remaining steps of `deploy-ledger.ts` verbatim —
 * initialize → registerCredential → attest → indexer verification →
 * .env.local + .deploy/nova-contract.json records — without re-publishing.
 *
 *   npx tsx scripts/finish-preview-deploy.ts <contractAddress> [preview|preprod]
 */

import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { pino } from 'pino';
import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { WebSocket } from 'ws';
import { findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import {
  NovaContract,
  Contract as NovaContractType,
  createNovaPrivateState,
  ledger as decodeLedger,
  RegistryStatus,
  type NovaPrivateState,
} from 'nova-contract';
import { NovaWalletProvider } from './lib/wallet-provider.js';
import { loadEnvFiles } from './lib/env.js';

// @ts-expect-error — WebSocket polyfill required by the indexer client on Node
globalThis.WebSocket = WebSocket;

type NovaPrivateStateId = 'novaPrivateState';
type NovaCircuits = 'initialize' | 'suspend' | 'resume' | 'registerCredential' | 'attest';
type NovaProviders = MidnightProviders<NovaCircuits, NovaPrivateStateId, NovaPrivateState>;

const logger = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const ENDPOINTS: Record<'preprod' | 'preview', EnvironmentConfiguration> = {
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

const EXPLORERS: Record<string, string> = {
  preprod: 'https://preprod.midnightexplorer.com',
  preview: 'https://preview.midnightexplorer.com',
};

const randomBytes32 = (): Uint8Array => new Uint8Array(nodeRandomBytes(32));

function dumpError(where: string, error: unknown): void {
  logger.error(
    {
      where,
      type: typeof error,
      name: error instanceof Error ? error.name : String((error as { name?: unknown })?.name ?? ''),
      message: error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error),
      cause: (error as { cause?: unknown })?.cause !== undefined
        ? util.inspect((error as { cause: unknown }).cause, { depth: 4 })
        : undefined,
      ownProps: util.inspect(error, { depth: 5 }),
    },
    'Step failed — full real error details above (nothing fabricated).',
  );
}

async function main(): Promise<void> {
  const contractAddress = process.argv[2];
  const network = (process.argv[3] ?? 'preview') as 'preprod' | 'preview';
  if (!contractAddress || !/^[0-9a-f]{64}$/i.test(contractAddress)) {
    logger.error('Usage: npx tsx scripts/finish-preview-deploy.ts <64-hex contract address> [preview|preprod]');
    process.exit(1);
  }
  const env = ENDPOINTS[network];
  setNetworkId(network);
  loadEnvFiles();

  const seed = process.env[`MIDNIGHT_${network.toUpperCase()}_SEED`] ?? process.env.MIDNIGHT_WALLET_SEED;
  if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
    logger.error(`MIDNIGHT_${network.toUpperCase()}_SEED (64-hex) is required in .env.local.`);
    process.exit(1);
  }

  logger.info(`Attaching to NØVA contract ${contractAddress} on Midnight ${network}…`);
  const walletProvider = await NovaWalletProvider.build(logger, env, seed);
  await walletProvider.start();

  let exitCode = 0;
  try {
    const wallet = walletProvider.wallet;
    const token = unshieldedToken();
    const state = await firstValueFrom(
      wallet.state().pipe(
        Rx.filter((s) => s.unshielded.availableCoins.length > 0 && s.dust.balance(new Date()) > 0n),
        Rx.timeout({ each: Number(process.env.SYNC_WAIT_MS ?? 30 * 60_000) }),
      ),
    );
    const dust = state.dust.balance(new Date());
    const balance = state.unshielded.balances[token.raw] ?? 0n;
    logger.info(`Wallet ready: tNIGHT=${balance}, tDUST=${dust}, coins=${state.unshielded.availableCoins.length}`);
    if (dust === 0n) throw new Error('No spendable tDUST — cannot pay transaction fees.');

    const zkConfigProvider = new NodeZkConfigProvider<NovaCircuits>(
      path.resolve(process.cwd(), 'contract', 'src', 'managed', 'nova'),
    );
    const providers: NovaProviders = {
      privateStateProvider: levelPrivateStateProvider<NovaPrivateStateId, NovaPrivateState>({
        privateStateStoreName: `nova-private-state-${network}`,
        signingKeyStoreName: `nova-private-state-${network}-signing`,
        privateStoragePasswordProvider: () => 'Nova!PrivateState2026#local',
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(env.indexer, env.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(env.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };

    // Attach with the private state stored by the original deploy run.
    let attached: FoundContract<NovaContractType<NovaPrivateState>>;
    try {
      attached = await findDeployedContract(providers, {
        compiledContract: NovaContract,
        contractAddress,
        privateStateId: 'novaPrivateState',
      });
    } catch (error) {
      dumpError('findDeployedContract', error);
      throw error;
    }
    logger.info(
      {
        deployTx: attached.deployTxData.public.txHash,
        blockHeight: attached.deployTxData.public.blockHeight,
        blockHash: attached.deployTxData.public.blockHash,
      },
      'Attached to published contract (deploy tx data resolved via indexer).',
    );

    // 1 — initialize (operator attestation, uses stored localAdminSecretKey)
    const init = await attached.callTx.initialize();
    logger.info({ txHash: init.public.txHash, blockHeight: init.public.blockHeight }, 'Registry initialized.');

    // 2 — test interactions: register a credential commitment + attest
    const privateStateStore = providers.privateStateProvider;
    const patch = async (partial: Partial<NovaPrivateState>) => {
      const current =
        (await privateStateStore.get('novaPrivateState')) ??
        createNovaPrivateState(randomBytes32(), randomBytes32(), randomBytes32());
      await privateStateStore.set('novaPrivateState', { ...current, ...partial });
    };
    const issuer = new TextEncoder().encode('nova:test:fiem');
    await patch({ credentialSecret: randomBytes32() });
    const reg = await attached.callTx.registerCredential(issuer);
    logger.info({ txHash: reg.public.txHash, blockHeight: reg.public.blockHeight }, 'Test credential registered.');

    await patch({ holderEntropy: randomBytes32() });
    const att = await attached.callTx.attest(new TextEncoder().encode('nova:test:hackspire-grant'));
    const attestationHex = Buffer.from(att.private.result as Uint8Array).toString('hex');
    logger.info({ txHash: att.public.txHash, blockHeight: att.public.blockHeight, attestation: attestationHex }, 'Test attestation recorded.');

    // 3 — read back public state from the indexer
    let publicState = null;
    for (let attempt = 0; attempt < 6 && publicState === null; attempt += 1) {
      await new Promise((r) => setTimeout(r, 5_000));
      const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
      if (contractState) {
        const l = decodeLedger(contractState.data);
        publicState = {
          status: RegistryStatus[l.status],
          credentialCount: l.credentialCount.toString(),
          proofCount: l.proofCount.toString(),
          lastAttestation: Buffer.from(l.lastAttestation).toString('hex'),
        };
      }
    }
    logger.info({ publicState }, 'Verified public ledger state via indexer.');
    if (!publicState || publicState.status !== 'LIVE') {
      throw new Error(`Post-deploy verification did not reach LIVE state: ${JSON.stringify(publicState)}`);
    }

    // Persist public deployment config into .env.local (git-ignored file;
    // contract address is public — the seed stays untouched).
    const envPath = path.resolve('.env.local');
    let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const setVar = (name: string, value: string) => {
      const re = new RegExp(`^${name}=.*$`, 'm');
      const line = `${name}=${value}`;
      envText = re.test(envText) ? envText.replace(re, line) : `${envText.trimEnd()}\n${line}\n`;
    };
    setVar('NEXT_PUBLIC_MIDNIGHT_MODE', 'ledger');
    setVar('NEXT_PUBLIC_MIDNIGHT_NETWORK_ID', network);
    setVar('NEXT_PUBLIC_MIDNIGHT_CONTRACT_ID', contractAddress);
    setVar('NEXT_PUBLIC_MIDNIGHT_INDEXER_URL', env.indexer);
    setVar('NEXT_PUBLIC_MIDNIGHT_NODE_URL', env.node);
    fs.writeFileSync(envPath, envText.trimStart());
    logger.info('.env.local updated with ledger-mode configuration.');

    fs.mkdirSync('.deploy', { recursive: true });
    const record = {
      network,
      contractName: 'Nova',
      contractAddress,
      deploymentTx: attached.deployTxData.public.txHash,
      initializeTx: init.public.txHash,
      registerCredentialTx: reg.public.txHash,
      attestTx: att.public.txHash,
      deployerAddress: UnshieldedAddress.codec
        .encode(getNetworkId(), (await firstValueFrom(wallet.unshielded.state)).address)
        .toString(),
      deployBlockHeight: String(attached.deployTxData.public.blockHeight),
      initializeBlockHeight: String(init.public.blockHeight),
      verifiedPublicState: publicState,
      explorer: EXPLORERS[network],
      deployedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.resolve('.deploy', 'nova-contract.json'), JSON.stringify(record, null, 2));

    logger.info('──────────────────────────────────────────────');
    logger.info(`Contract address : ${contractAddress}`);
    logger.info(`Deployment tx    : ${record.deploymentTx} (block ${record.deployBlockHeight})`);
    logger.info(`Initialize tx    : ${record.initializeTx} (block ${record.initializeBlockHeight})`);
    logger.info(`Explorer         : ${EXPLORERS[network]}/address/${contractAddress}`);
    logger.info('──────────────────────────────────────────────');
  } catch (error) {
    exitCode = 1;
    dumpError('finish-preview-deploy', error);
    logger.error('Deployment resume failed — real error above, nothing was fabricated.');
  } finally {
    await walletProvider.stop().catch(() => {});
    process.exit(exitCode);
  }
}

void main();
