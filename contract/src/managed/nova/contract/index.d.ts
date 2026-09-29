import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum RegistryStatus { BOOTSTRAPPING = 0, LIVE = 1, SUSPENDED = 2 }

export type Witnesses<PS> = {
  localAdminSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  credentialSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  holderEntropy(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  suspend(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     issuer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  attest(context: __compactRuntime.CircuitContext<PS>, scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  suspend(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     issuer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  attest(context: __compactRuntime.CircuitContext<PS>, scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
  operatorPublicKey(sk_0: Uint8Array, epoch_0: Uint8Array): Uint8Array;
  credentialCommitmentFor(secret_0: Uint8Array, issuer_0: Uint8Array): Uint8Array;
  accumulatorNext(accumulator_0: Uint8Array, commitment_0: Uint8Array): Uint8Array;
  attestationFor(secret_0: Uint8Array,
                 scope_0: Uint8Array,
                 entropy_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  operatorPublicKey(context: __compactRuntime.CircuitContext<PS>,
                    sk_0: Uint8Array,
                    epoch_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialCommitmentFor(context: __compactRuntime.CircuitContext<PS>,
                          secret_0: Uint8Array,
                          issuer_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  accumulatorNext(context: __compactRuntime.CircuitContext<PS>,
                  accumulator_0: Uint8Array,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  attestationFor(context: __compactRuntime.CircuitContext<PS>,
                 secret_0: Uint8Array,
                 scope_0: Uint8Array,
                 entropy_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  suspend(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     issuer_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  attest(context: __compactRuntime.CircuitContext<PS>, scope_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly status: RegistryStatus;
  readonly owner: Uint8Array;
  readonly sequence: bigint;
  readonly credentialAccumulator: Uint8Array;
  readonly credentialCount: bigint;
  readonly proofCount: bigint;
  readonly lastAttestation: Uint8Array;
  readonly lastAttestationScope: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
