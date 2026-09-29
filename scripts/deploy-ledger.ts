/*
 * NØVA — publish the Compact contract to a real Midnight network,
 * initialize it, exercise the attestation path and verify ledger state.
 *
 * Usage:
 *   1. cp .env.example .env.local; fund the deploy wallet (npm run wallet:init
 *      prints the address; faucet has a manual captcha).
 *   2. start the local proof server (loopback only):
 *      docker run -d -p 6300:6300 midnightntwrk/proof-server:8.1.0
 *   3. npm run deploy:ledger [preprod|preview]
 *
 * Stages (each measured and logged; first run on a network pays the full
 * indexer replay once, later runs restore wallet checkpoints from
 * .wallet-cache/ — see scripts/lib/wallet-provider.ts):
 *
 *   [1/8] environment   [5/8] dust readiness
 *   [2/8] artifacts     [6/8] publish contract
 *   [3/8] proof server  [7/8] initialize + test circuits
 *   [4/8] wallet sync   [8/8] verify + record
 *
 * Outputs the real contract address + tx hashes; the script writes them into
 * .env.local (NEXT_PUBLIC_*) and .deploy/nova-contract.json itself.
 */

import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { pino } from 'pino';
import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { WebSocket } from 'ws';
import { deployContract, findDeployedContract, type DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import axios from 'axios';
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
import { ensureDustReady } from './lib/generate-dust.js';
import { resolveTxHeight } from './lib/resolve-tx-height.js';
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

const TOTAL_STAGES = 8;
const stageTimes: { label: string; ms: number }[] = [];
let stageStarted = Date.now();

function stage(n: number, label: string): void {
  const now = Date.now();
  const prev = stageTimes[stageTimes.length - 1];
  if (prev) prev.ms = now - stageStarted;
  stageTimes.push({ label, ms: 0 });
  stageStarted = now;
  logger.info(`[${n}/${TOTAL_STAGES}] ${label}…`);
}

function finishStages(): void {
  const last = stageTimes[stageTimes.length - 1];
  if (last) last.ms = Date.now() - stageStarted;
  logger.info('Stage timings:');
  for (const s of stageTimes) logger.info(`  ${s.label.padEnd(34)} ${(s.ms / 1000).toFixed(1)}s`);
}

const randomBytes32 = (): Uint8Array => new Uint8Array(nodeRandomBytes(32));

/** Pads/rejects byte strings for Bytes<32> circuit parameters. */
const toBytes32 = (text: string): Uint8Array => {
  const raw = new TextEncoder().encode(text);
  if (raw.length > 32) throw new Error(`circuit parameter "${text}" exceeds Bytes<32>`);
  const out = new Uint8Array(32);
  out.set(raw, 32 - raw.length);
  return out;
};

function withDeadline<T>(label: string, promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} did not complete within ${Math.round(timeoutMs / 1000)}s`)),
      timeoutMs,
    );
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function dumpError(where: string, error: unknown): void {
  logger.error(
    {
      where,
      name: error instanceof Error ? error.name : String((error as { name?: unknown })?.name ?? ''),
      message: error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error),
      detail: util.inspect(error, { depth: 5 }),
    },
    'Real error details (nothing fabricated).',
  );
}

async function main(): Promise<void> {
  const network = (process.argv[2] ?? 'preprod') as 'preprod' | 'preview';
  const env = ENDPOINTS[network];
  if (!env) {
    logger.error(`unknown network ${network} (use preprod|preview)`);
    process.exit(1);
  }
  setNetworkId(network);
  loadEnvFiles();

  // [1/8] environment
  stage(1, `Environment (${network})`);
  const seed = process.env[`MIDNIGHT_${network.toUpperCase()}_SEED`] ?? process.env.MIDNIGHT_WALLET_SEED;
  if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
    logger.error(`MIDNIGHT_${network.toUpperCase()}_SEED (64-hex) is required in .env.local — run: npm run wallet:init ${network}`);
    process.exit(1);
  }
  const proofServerUrl = new URL(env.proofServer);
  if (!['localhost', '127.0.0.1', '::1'].includes(proofServerUrl.hostname)) {
    logger.error('PROOF_SERVER_URL must point at loopback — witness material would leave this machine.');
    process.exit(1);
  }

  // [2/8] compiled contract artifacts
  stage(2, 'Loading ZK artifacts');
  const zkDir = path.resolve(process.cwd(), 'contract', 'src', 'managed', 'nova');
  for (const required of ['contract/index.js', 'zkir/initialize.zkir', 'keys/initialize.prover', 'keys/attest.verifier']) {
    if (!fs.existsSync(path.join(zkDir, required))) {
      logger.error(`Missing build artifact ${required} — run: npm run contract`);
      process.exit(1);
    }
  }

  // [3/8] proof server
  stage(3, 'Proof server health');
  try {
    const health = await withDeadline(
      'proof server health check',
      axios.get(`${env.proofServer}/health`, { timeout: 5_000 }),
      10_000,
    );
    logger.info(`proof server: ${JSON.stringify(health.data)}`);
  } catch (error) {
    dumpError('proof-server', error);
    logger.error(`Start it first: docker run -d -p 6300:6300 midnightntwrk/proof-server:8.1.0`);
    process.exit(1);
  }

  logger.info(`Deploying NØVA Compact contract to Midnight ${network}…`);

  // [4/8] wallet (checkpoint restore, or full replay on first run per network)
  stage(4, 'Wallet connect + sync');
  const walletProvider = await NovaWalletProvider.build(logger, env, seed);
  await walletProvider.start();

  let exitCode = 0;
  try {
    const wallet = walletProvider.wallet;
    const token = unshieldedToken();
    const unshielded0 = await firstValueFrom(wallet.unshielded.state);
    const deployerAddress = UnshieldedAddress.codec.encode(getNetworkId(), unshielded0.address).toString();
    let balance = unshielded0.balances[token.raw] ?? 0n;
    if (balance === 0n) {
      logger.info(
        { unshieldedAddress: deployerAddress, faucet: env.faucet },
        `Wallet has no tNIGHT yet — waiting for faucet payout on ${deployerAddress} (manual captcha step at ${env.faucet}). FUNDS_WAIT_MS extends the window.`,
      );
    }
    const deadline = Date.now() + Number(process.env.FUNDS_WAIT_MS ?? 30 * 60_000);
    while (balance === 0n && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 15_000));
      const st = await firstValueFrom(wallet.unshielded.state);
      balance = st.balances[token.raw] ?? 0n;
      if (balance > 0n) logger.info(`tNIGHT received: ${balance}`);
    }
    if (balance === 0n) {
      logger.error(`Funding did not arrive within the window — nothing was deployed. Fund ${deployerAddress} at ${env.faucet}, then re-run (checkpoint makes the next sync fast).`);
      exitCode = 1;
      return;
    }
    logger.info(`tNIGHT balance: ${balance}`);

    let unshielded = await firstValueFrom(wallet.unshielded.state);
    for (let i = 0; unshielded.availableCoins.length === 0 && i < 24; i += 1) {
      await new Promise((r) => setTimeout(r, 10_000));
      unshielded = await firstValueFrom(wallet.unshielded.state);
    }
    logger.info(`Unshielded coins visible: ${unshielded.availableCoins.length}`);

    // [5/8] DUST fees
    stage(5, 'DUST readiness (register + grace)');
    const dustBalance = await ensureDustReady(
      logger,
      seed,
      wallet,
      Number(process.env.DUST_GRACE_BUDGET_MS ?? 3.7 * 60 * 60_000),
    );
    logger.info(`Fee balance ready: ${dustBalance} tDUST`);

    const zkConfigProvider = new NodeZkConfigProvider<NovaCircuits>(zkDir);
    const privateStatePassword = process.env.MIDNIGHT_PRIVATE_STATE_PASSWORD ?? 'Nova!PrivateState2026#local';
    if (!process.env.MIDNIGHT_PRIVATE_STATE_PASSWORD) {
      logger.warn('MIDNIGHT_PRIVATE_STATE_PASSWORD unset — using the legacy local-dev default for the private-state store.');
    }
    const providers: NovaProviders = {
      privateStateProvider: levelPrivateStateProvider<NovaPrivateStateId, NovaPrivateState>({
        privateStateStoreName: `nova-private-state-${network}`,
        signingKeyStoreName: `nova-private-state-${network}-signing`,
        privateStoragePasswordProvider: () => privateStatePassword,
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(env.indexer, env.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(env.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };
    const callDeadlineMs = Number(process.env.CALL_TX_TIMEOUT_MS ?? 5 * 60_000);

    // [6/8] publish (or resume an already-published deployment)
    stage(6, 'Submit deployment tx');
    const pendingFile = path.resolve('.deploy', `pending-${network}.json`);
    let contractAddress: string | undefined;
    let deploymentTx: string | undefined;
    let tipBeforeDeploy = 0;

    type ContractHandle = {
      callTx: DeployedContract<NovaContractType<NovaPrivateState>>['callTx'];
      deployTxData: { public: { txHash: string; blockHash?: string; blockHeight?: number | bigint } };
    };
    let handle: ContractHandle | undefined;
    let resumed = false;
    let registryLive = false;
    let credentialsRecorded = false;

    if (fs.existsSync(pendingFile)) {
      const pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8')) as { contractAddress: string; deploymentTx: string };
      const existing = await providers.publicDataProvider.queryContractState(pending.contractAddress);
      if (existing) {
        const d = decodeLedger(existing.data);
        registryLive = RegistryStatus[d.status] === 'LIVE';
        credentialsRecorded = d.credentialCount.toString() !== '0';
        contractAddress = pending.contractAddress;
        deploymentTx = pending.deploymentTx;
        // Private state is keyed by contract address, and the provider throws if
        // it has not been bound before use — so a resumed run binds it before
        // its first call, as both reference deployments do in their join() path.
        providers.privateStateProvider.setContractAddress(contractAddress);
        handle = await withDeadline(
          'findDeployedContract',
          findDeployedContract(providers, {
            compiledContract: NovaContract,
            contractAddress,
            privateStateId: 'novaPrivateState',
          }),
          callDeadlineMs,
        );
        resumed = true;
        logger.info({ contractAddress, registryLive, credentialsRecorded }, 'Resuming existing deployment — NOT re-publishing.');
      } else {
        logger.warn('Pending deployment file references an address the indexer does not know — publishing fresh.');
      }
    }

    if (!resumed) {
      const tipBeforeDeployResp = await axios.post(env.indexer, { query: '{ block { height } }' }, { timeout: 15_000 });
      tipBeforeDeploy = Number(tipBeforeDeployResp.data?.data?.block?.height);

      let deployed: DeployedContract<NovaContractType<NovaPrivateState>> | undefined;
      const MAX_DEPLOY_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_DEPLOY_ATTEMPTS; attempt += 1) {
        try {
          deployed = await withDeadline(
            'deployContract',
            deployContract(providers, {
              compiledContract: NovaContract,
              privateStateId: 'novaPrivateState',
              initialPrivateState: createNovaPrivateState(randomBytes32(), randomBytes32(), randomBytes32()),
            }),
            callDeadlineMs,
          );
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // Fee-accrual races are retryable; anything else aborts with full detail.
          if (!/insufficient|dust|not finalized within/i.test(message) || attempt === MAX_DEPLOY_ATTEMPTS) {
            dumpError('deployContract', err);
            throw err;
          }
          logger.warn(`Deploy attempt ${attempt} blocked on fees (${message}); waiting 90s for more tDUST…`);
          await new Promise((r) => setTimeout(r, 90_000));
        }
      }
      if (!deployed) throw new Error('deployContract returned undefined');
      handle = deployed;
      contractAddress = deployed.deployTxData.public.contractAddress;
      deploymentTx = deployed.deployTxData.public.txHash;
      fs.mkdirSync('.deploy', { recursive: true, mode: 0o700 });
      fs.writeFileSync(pendingFile, JSON.stringify({ contractAddress, deploymentTx, at: new Date().toISOString() }), { mode: 0o600 });
      logger.info({ contractAddress, txHash: deploymentTx }, 'Contract published.');
    }
    if (!contractAddress || !deploymentTx || !handle) throw new Error('unreachable: missing contract identity');

    // [7/8] initialize + exercise the attestation path
    stage(7, 'Initialize + test circuits');
    const init = registryLive
      ? undefined
      : await withDeadline('callTx.initialize', handle.callTx.initialize(), callDeadlineMs);
    if (init) logger.info({ txHash: init.public.txHash, blockHash: init.public.blockHash }, 'Registry initialized.');
    else logger.info('Registry already LIVE — skipping initialize (resume path).');

    const privateStateStore = providers.privateStateProvider;
    const patch = async (partial: Partial<NovaPrivateState>) => {
      const current =
        (await privateStateStore.get('novaPrivateState')) ??
        createNovaPrivateState(randomBytes32(), randomBytes32(), randomBytes32());
      await privateStateStore.set('novaPrivateState', { ...current, ...partial });
    };
    await patch({ credentialSecret: randomBytes32() });
    let registerCredentialTx = 'pre-existing';
    let attestTx = 'pre-existing';
    if (!credentialsRecorded) {
      const reg = await withDeadline(
        'callTx.registerCredential',
        handle.callTx.registerCredential(toBytes32('nova:test:fiem')),
        callDeadlineMs,
      );
      registerCredentialTx = reg.public.txHash;
      logger.info({ txHash: reg.public.txHash }, 'Test credential registered.');

      // Fresh single-use entropy per attestation (privacy: no cross-scope correlation).
      await patch({ holderEntropy: randomBytes32() });
      const att = await withDeadline(
        'callTx.attest',
        handle.callTx.attest(toBytes32('nova:test:hackspire-grant')),
        callDeadlineMs,
      );
      attestTx = att.public.txHash;
      const attestationHex = Buffer.from(att.private.result as Uint8Array).toString('hex');
      logger.info({ txHash: att.public.txHash, attestation: `${attestationHex.slice(0, 12)}…` }, 'Test attestation recorded.');
    } else {
      logger.info('Test interactions already on-chain from a previous run — skipping (resume path).');
    }

    // [8/8] verify via indexer + resolve real heights
    stage(8, 'Verify via indexer + record');
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
          lastAttestation: Buffer.from(l.lastAttestation).toString('hex').slice(0, 24) + '…',
        };
      }
    }
    logger.info({ publicState }, 'Verified public ledger state via indexer.');
    if (!publicState || publicState.status !== 'LIVE') {
      throw new Error(`Post-deploy verification did not reach LIVE state: ${JSON.stringify(publicState)}`);
    }

    const deploymentHeight = tipBeforeDeploy > 0
      ? await resolveTxHeight(env.indexer, deploymentTx, tipBeforeDeploy)
      : undefined;
    if (deploymentHeight) logger.info(`Deployment tx confirmed in block ${deploymentHeight.height}.`);
    else logger.warn('Deployment tx height not resolved from indexer scan — record kept as "pending-indexer" (verify via explorer).');

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
    fs.writeFileSync(envPath, envText.trimStart(), { mode: 0o600 });
    fs.chmodSync(envPath, 0o600);
    logger.info('.env.local updated with ledger-mode configuration (mode 0600).');

    fs.mkdirSync('.deploy', { recursive: true, mode: 0o700 });
    const record = {
      network,
      contractName: 'Nova',
      contractAddress,
      deploymentTx,
      deployBlockHeight: deploymentHeight ? String(deploymentHeight.height) : 'pending-indexer',
      initializeTx: init?.public.txHash ?? 'pre-existing',
      registerCredentialTx,
      attestTx,
      deployerAddress,
      verifiedPublicState: publicState,
      explorer: EXPLORERS[network],
      deployedAt: new Date().toISOString(),
      stageTimingsSec: Object.fromEntries(stageTimes.map((s) => [s.label, +(s.ms / 1000).toFixed(1)])),
    };
    fs.writeFileSync(path.resolve('.deploy', 'nova-contract.json'), JSON.stringify(record, null, 2), { mode: 0o600 });
    fs.rmSync(pendingFile, { force: true });

    logger.info('──────────────────────────────────────────────');
    logger.info(`Contract address : ${contractAddress}`);
    logger.info(`Deployment tx    : ${deploymentTx}${deploymentHeight ? ` (block ${deploymentHeight.height})` : ''}`);
    logger.info(`Initialize tx    : ${record.initializeTx}`);
    logger.info(`Explorer         : ${EXPLORERS[network]}/address/${contractAddress}`);
    logger.info('Frontend env:');
    logger.info('  NEXT_PUBLIC_MIDNIGHT_MODE=ledger');
    logger.info(`  NEXT_PUBLIC_MIDNIGHT_NETWORK_ID=${network}`);
    logger.info(`  NEXT_PUBLIC_MIDNIGHT_CONTRACT_ID=${contractAddress}`);
    logger.info('──────────────────────────────────────────────');
  } catch (error) {
    exitCode = 1;
    dumpError('deploy-ledger', error);
    logger.error('Deployment failed — real error from the Midnight stack, nothing was fabricated.');
  } finally {
    finishStages();
    await walletProvider.stop().catch(() => {});
    process.exit(exitCode);
  }
}

void main();
