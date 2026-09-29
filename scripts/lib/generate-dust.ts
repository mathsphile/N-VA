/*
 * NØVA — tDUST readiness for testnet deployment wallets.
 * Derived from Midnight Foundation's example-bboard (Apache-2.0) and the
 * Night Access preprod fee path.
 *
 * Midnight fees are paid in DUST. On testnets:
 *  - tNIGHT UTXOs must be registered for tDUST generation;
 *  - faucet payouts arrive PRE-BOUND to the faucet's own dust address, so
 *    their generation never accrues to the deploy wallet — one UTXO must be
 *    deregistered and re-registered to OUR dust address;
 *  - Preprod enforces a DUST grace period (~3h) before freshly generated
 *    DUST becomes spendable.
 */

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore, type UnshieldedWalletState } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import type { Logger } from 'pino';
import * as rx from 'rxjs';
import { isWalletSynced } from './wallet-provider.js';

type Coin = UnshieldedWalletState['availableCoins'][number];

function keystoreFor(seed: string) {
  const result = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (result.type !== 'seedOk') throw new Error('Invalid seed: failed to create HD wallet');
  const derived = result.hdWallet
    .selectAccount(0)
    .selectRole(Roles.NightExternal)
    .deriveKeyAt(0);
  if (derived.type === 'keyOutOfBounds') throw new Error('Key derivation out of bounds');
  return createKeystore(derived.key, getNetworkId());
}

const utxoKey = (coin: Coin): string =>
  `${(coin.meta as unknown as { dustReceiver?: string }).dustReceiver ?? ''}#${coin.utxo.intentHash ?? ''}`;

async function readCoins(wallet: WalletFacade): Promise<Coin[]> {
  const state = await rx.firstValueFrom(wallet.unshielded.state);
  return [...state.availableCoins];
}

export async function generateDust(
  logger: Logger,
  walletSeed: string,
  unshieldedState: UnshieldedWalletState,
  walletFacade: WalletFacade,
): Promise<string | undefined> {
  const dustAddress = await walletFacade.dust.getAddress();
  const unshieldedKeystore = keystoreFor(walletSeed);
  const utxos = unshieldedState.availableCoins.filter((coin) => !coin.meta.registeredForDustGeneration);

  if (utxos.length === 0) {
    logger.info('No unregistered UTXOs found for dust generation.');
    return undefined;
  }

  logger.info(`Generating tDUST with ${utxos.length} UTXO(s)…`);
  const recipe = await walletFacade.registerNightUtxosForDustGeneration(
    [...utxos],
    unshieldedKeystore.getPublicKey(),
    (payload) => unshieldedKeystore.signData(payload),
    dustAddress,
  );
  const transaction = await walletFacade.finalizeRecipe(recipe);
  const txId = await walletFacade.submitTransaction(transaction);
  logger.info(`tDUST registration submitted: ${txId}`);

  try {
    await rx.firstValueFrom(
      walletFacade.state().pipe(
        rx.filter((s) => s.dust.balance(new Date()) > 0n),
        rx.timeout(20_000),
      ),
    );
  } catch {
    logger.info('tDUST registration submitted; balance not yet visible (grace period) — proceeding.');
  }
  return txId;
}

/**
 * Ensure the deploy wallet can actually SPEND tDUST:
 * 1. register unregistered coins against our dust address; otherwise
 * 2. if every coin is already registered but no DUST accrues to us, the
 *    registrations are faucet-bound — deregister one UTXO, wait for it to
 *    reappear unregistered, re-register it to our dust address;
 * 3. wait for DUST to become spendable (grace period, budget-bounded).
 */
export async function ensureDustReady(
  logger: Logger,
  walletSeed: string,
  wallet: WalletFacade,
  graceBudgetMs = 3.5 * 60 * 60_000,
): Promise<bigint> {
  const dustAddress = await wallet.dust.getAddress();
  const keystore = keystoreFor(walletSeed);

  const dustNow = async (): Promise<bigint> => {
    const st = await rx.firstValueFrom(wallet.state());
    return st.dust.balance(new Date());
  };

  // Gate on our own sync predicate, polled — deliberately NOT on
  // `wallet.waitForSyncedState()`. That observable filters on the SDK's
  // unshielded completion (`appliedId === highestTransactionId`), which cannot
  // resolve once a stored cursor sits above a frozen cap: it timed out for the
  // whole 1850s window, the run logged "proceeding cautiously", and it then
  // submitted an initialize built on a zswap tree that had aborted applying an
  // event — the node answered `Invalid Transaction: Custom error: 170`.
  // Registration and calls built on a stale or desynchronized view are rejected
  // by the node (138, 170), so no sync now means no submit, not a warning.
  const syncDeadline = Date.now() + Number(process.env.SYNC_WAIT_MS ?? 30 * 60_000);
  let synced = false;
  const syncStartedAt = Date.now();
  while (!synced && Date.now() < syncDeadline) {
    const state = await rx.firstValueFrom(wallet.state().pipe(rx.take(1)));
    synced = isWalletSynced(state);
    if (!synced) await new Promise((r) => setTimeout(r, 10_000));
  }
  if (!synced) {
    throw new Error(
      `Wallet never reached a synced state within ${Math.round((Date.now() - syncStartedAt) / 1000)}s — refusing to register or submit on a view the node will reject. ` +
        'If the log shows "values inserted non-linearly", the checkpoint cursor has drifted: run `npm run deploy:heal <network>` before retrying.',
    );
  }
  logger.info(`Wallet fully synced in ${Math.round((Date.now() - syncStartedAt) / 1000)}s — coin metadata is now authoritative.`);

  let coins = await readCoins(wallet);
  const unregistered = coins.filter((c) => !c.meta.registeredForDustGeneration);
  let registered = false;
  if (unregistered.length > 0) {
    await generateDust(logger, walletSeed, { availableCoins: unregistered } as unknown as UnshieldedWalletState, wallet);
    registered = true;
  }

  if (!registered && (await dustNow()) === 0n) {
    const target = coins.find((c) => c.meta.registeredForDustGeneration);
    if (!target) throw new Error('Wallet has no UTXOs to register for DUST.');

    // Strategy A — rotate the faucet-bound UTXO (works on preprod):
    let rotated = false;
    try {
      logger.info('♻️ Attempting faucet-bound UTXO rotation (deregister → re-register)…');
      const before = new Set(coins.map(utxoKey));
      const deregRecipe = await wallet.deregisterFromDustGeneration(
        [target],
        keystore.getPublicKey(),
        (payload) => keystore.signData(payload),
      );
      const deregTx = await wallet.finalizeRecipe(deregRecipe);
      await wallet.submitTransaction(deregTx);
      const deadline = Date.now() + 5 * 60_000;
      let fresh: Coin[] = [];
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 10_000));
        fresh = (await readCoins(wallet)).filter((c) => !c.meta.registeredForDustGeneration || !before.has(utxoKey(c)));
        if (fresh.length > 0) break;
      }
      if (fresh.length === 0) throw new Error('deregistered UTXO did not reappear');
      logger.info(`⚡ Re-registering ${fresh.length} UTXO(s) against our own dust address…`);
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        [...fresh],
        keystore.getPublicKey(),
        (payload) => keystore.signData(payload),
        dustAddress,
      );
      const tx = await wallet.finalizeRecipe(recipe);
      await wallet.submitTransaction(tx);
      rotated = true;
    } catch (error) {
      logger.warn(`Rotation unavailable (${error instanceof Error ? error.message : 'unknown'}) — trying direct re-registration.`);
    }

    // Strategy B — direct registration of ALL coins against our dust
    // address (preview accepts this; the ledger rebinds generation):
    if (!rotated) {
      try {
        const recipe = await wallet.registerNightUtxosForDustGeneration(
          coins,
          keystore.getPublicKey(),
          (payload) => keystore.signData(payload),
          dustAddress,
        );
        const tx = await wallet.finalizeRecipe(recipe);
        await wallet.submitTransaction(tx);
        logger.info('Direct re-registration to our dust address submitted.');
      } catch (error) {
        logger.warn(
          `Direct re-registration rejected (${error instanceof Error ? error.message : 'unknown'}) — ` +
            'continuing to wait for any DUST already accruing to this wallet.',
        );
      }
    }
  }

  logger.info(
    `Waiting up to ${Math.round(graceBudgetMs / 60_000)} min for spendable tDUST ` +
      '(preprod enforces ~3h on freshly generated dust; preview is typically faster)…',
  );
  const start = Date.now();
  let lastLog = 0;
  for (;;) {
    const bal = await dustNow();
    if (bal > 0n) {
      logger.info(`✅ Spendable tDUST: ${bal}`);
      return bal;
    }
    if (Date.now() - start > graceBudgetMs) {
      throw new Error('tDUST never became spendable within the grace budget — deployment cannot pay fees.');
    }
    if (Date.now() - lastLog > 5 * 60_000) {
      lastLog = Date.now();
      logger.info(`…tDUST still 0; ~${Math.ceil((graceBudgetMs - (Date.now() - start)) / 60_000)} min of wait budget left`);
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
}
