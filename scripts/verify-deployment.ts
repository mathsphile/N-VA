/*
 * NØVA — verify a deployed contract on a Midnight network through the
 * public indexer (read-only, no wallet, no secrets).
 *
 *   npx tsx scripts/verify-deployment.ts [preview|preprod] [contractAddress]
 *
 * With no address given, falls back to the recorded deployment in
 * .deploy/nova-contract.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import axios from 'axios';
import { WebSocket } from 'ws';
import { RegistryStatus, ledger as decodeLedger } from 'nova-contract';

// @ts-expect-error — WebSocket polyfill required by the indexer client on Node
globalThis.WebSocket = WebSocket;

type Network = 'preview' | 'preprod';

const ENDPOINTS: Record<Network, { indexer: string; indexerWS: string; explorer: string }> = {
  preview: {
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    explorer: 'https://preview.midnightexplorer.com',
  },
  preprod: {
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    explorer: 'https://preprod.midnightexplorer.com',
  },
};

const GRAPHQL_INDEXED_QUERY = `query ContractTxs($address: String!) {
  contract(address: $address) {
    creationBlock { height }
    transactions { edges { node { operation { __typename } transactionResult { status } } } }
  }
}`;

async function main(): Promise<void> {
  const network = (process.argv[2] ?? 'preview') as Network;
  const env = ENDPOINTS[network];
  if (!env) throw new Error(`unsupported network: ${network}`);
  setNetworkId(network);

  const recordPath = path.resolve('.deploy', 'nova-contract.json');
  const record = fs.existsSync(recordPath)
    ? (JSON.parse(fs.readFileSync(recordPath, 'utf8')) as {
        contractAddress: string;
        deploymentTx: string;
        deployerAddress: string;
      })
    : undefined;

  const address = process.argv[3] ?? record?.contractAddress;
  if (!address || !/^[0-9a-f]{64}$/i.test(address)) {
    console.error('Usage: npx tsx scripts/verify-deployment.ts [preview|preprod] <64-hex contract address>');
    process.exit(1);
  }

  // 1 — contract public state via the midnight-js indexer provider
  const provider = indexerPublicDataProvider(env.indexer, env.indexerWS);
  const state = await provider.queryContractState(address as never);
  if (!state) {
    console.error(`No contract state found for ${address} — indexer has not indexed it (yet).`);
    process.exit(1);
  }
  const l = decodeLedger(state.data);
  console.log(`=== NØVA contract public state on ${network} (decoded from ledger) ===`);
  console.log('status               :', RegistryStatus[l.status]);
  console.log('credentialCount      :', l.credentialCount.toString());
  console.log('proofCount           :', l.proofCount.toString());
  console.log('credentialAccumulator:', Buffer.from(l.credentialAccumulator).toString('hex').slice(0, 24) + '…');
  console.log('lastAttestation      :', Buffer.from(l.lastAttestation).toString('hex').slice(0, 24) + '…');
  console.log('lastAttestationScope :', Buffer.from(l.lastAttestationScope).toString('hex').replace(/00+$/, '') || '(empty)');

  // 2 — raw GraphQL: the contract's indexed transactions (best-effort; the
  // v4 store schema may differ between networks — the state check above is
  // the authoritative finalization signal).
  try {
    const res = await axios.post(env.indexer, {
      query: GRAPHQL_INDEXED_QUERY,
      variables: { address },
      timeout: 15_000,
    });
    const edges: unknown[] = res.data?.data?.contract?.transactions?.edges ?? [];
    const ops: string[] = edges.map((e) => {
      const node = (e as { node?: { operation?: { __typename?: string }; transactionResult?: { status?: string } } })?.node;
      return `${node?.operation?.__typename ?? 'unknown'}:${node?.transactionResult?.status ?? '?'}`;
    });
    console.log('indexed operations   :', ops.length ? ops.join(', ') : '(none yet)');
  } catch (error) {
    console.log('indexed operations   : (schema query unavailable:', error instanceof Error ? error.message : String(error), ')');
  }

  // 3 — explorer links
  console.log('explorer (contract)  :', `${env.explorer}/address/${address}`);
  if (record?.deploymentTx) {
    // Only /address/<addr> resolves on the Midnight explorers — /transaction/, /tx/ and /block/
    // all return 404 — so the tx hash is printed for lookup against the contract page, not linked.
    console.log('deployment tx        :', record.deploymentTx, '(see the contract page above)');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
