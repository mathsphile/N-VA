import { pino } from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { firstValueFrom } from 'rxjs';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
// @ts-expect-error polyfill
globalThis.WebSocket = WebSocket;
setNetworkId('preprod');
const logger = pino({ level: 'error' });
const env = {
  walletNetworkId: 'preprod', networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
  proofServer: 'http://localhost:6300',
} as const;
const { NovaWalletProvider } = await import('./lib/wallet-provider.js');
const { loadEnvFiles } = await import('./lib/env.js');
loadEnvFiles();
const seed = process.env.MIDNIGHT_WALLET_SEED as string;
const p = await NovaWalletProvider.build(logger, env, seed);
await p.start();
const w = p.wallet;
for (let i = 0; i < 8; i += 1) {
  const st = await firstValueFrom(w.state().pipe(Rx.take(1)));
  const now = new Date();
  const in5min = new Date(Date.now() + 5 * 60_000);
  console.log(`t+${i * 15}s dust(now)=${st.dust.balance(now)} dust(+5m forecast)=${st.dust.balance(in5min)} unshielded=${st.unshielded.availableCoins.length} shieldedSynced=${
    typeof (st.shielded.state.progress as { isStrictlyComplete?: () => boolean })?.isStrictlyComplete === 'function'
      ? (st.shielded.state.progress as { isStrictlyComplete: () => boolean }).isStrictlyComplete() : '?'}`);
  if (st.dust.balance(now) > 0n) break;
  await new Promise((r) => setTimeout(r, 15_000));
}
await p.stop();
process.exit(0);
