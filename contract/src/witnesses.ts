/*
 * Witness implementations for the NØVA contract.
 *
 * Private state held by each client:
 *  - adminSecretKey: registry operator key authorizing initialize/suspend/resume;
 *  - credentialSecret: the holder's credential secret. It binds their
 *    eligible attributes (student status, age, region, ...) which stay on
 *    the holder's device; only its one-way commitment reaches the ledger;
 *  - holderEntropy: single-use entropy for uniqueness attestations.
 */

import { Ledger } from "./managed/nova/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type NovaPrivateState = {
  readonly adminSecretKey: Uint8Array;
  readonly credentialSecret: Uint8Array;
  readonly holderEntropy: Uint8Array;
};

export const createNovaPrivateState = (
  adminSecretKey: Uint8Array,
  credentialSecret: Uint8Array,
  holderEntropy: Uint8Array,
): NovaPrivateState => ({ adminSecretKey, credentialSecret, holderEntropy });

export const witnesses = {
  localAdminSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, NovaPrivateState>): [NovaPrivateState, Uint8Array] => [
    privateState,
    privateState.adminSecretKey,
  ],

  credentialSecret: ({
    privateState,
  }: WitnessContext<Ledger, NovaPrivateState>): [NovaPrivateState, Uint8Array] => [
    privateState,
    privateState.credentialSecret,
  ],

  holderEntropy: ({
    privateState,
  }: WitnessContext<Ledger, NovaPrivateState>): [NovaPrivateState, Uint8Array] => [
    privateState,
    privateState.holderEntropy,
  ],
};
