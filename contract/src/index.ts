/*
 * NØVA Compact contract — private credential commitments and proof
 * attestations on Midnight.
 */

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/nova/contract/index.js";
export * from "./witnesses";

import * as CompiledNovaContract from "./managed/nova/contract/index.js";
import * as Witnesses from "./witnesses";

export const NovaContract = CompiledContract.make<
  CompiledNovaContract.Contract<Witnesses.NovaPrivateState>
>("Nova", CompiledNovaContract.Contract<Witnesses.NovaPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/nova"),
);

/**
 * Browser-safe metadata about the compiled contract. Kept in sync with
 * the generated `Circuits` type by contract/src/test/metadata.test.ts —
 * importing the runtime package into the browser is deliberately avoided.
 */
export const NOVA_CONTRACT_METADATA = {
  name: "Nova",
  source: "nova.compact",
  circuits: [
    "operatorPublicKey",
    "credentialCommitmentFor",
    "accumulatorNext",
    "attestationFor",
    "initialize",
    "suspend",
    "resume",
    "registerCredential",
    "attest",
  ] as ReadonlyArray<keyof CompiledNovaContract.Circuits<Witnesses.NovaPrivateState>>,
  ledgers: [
    "status", "owner", "sequence", "credentialAccumulator",
    "credentialCount", "proofCount", "lastAttestation", "lastAttestationScope",
  ] as const,
} as const;

