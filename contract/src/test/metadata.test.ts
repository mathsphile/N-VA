import { describe, expect, it } from 'vitest';
import { Contract } from '../managed/nova/contract/index.js';
import { witnesses, type NovaPrivateState } from '../witnesses.js';
import { NOVA_CONTRACT_METADATA } from '../index.js';

const key = new Uint8Array(32);
const contract = new Contract<NovaPrivateState>({ ...witnesses });
void key;

describe('nova contract metadata', () => {
  it('exposes exactly the documented circuits', () => {
    const generated = Object.keys(contract.circuits).sort();
    const documented = [...NOVA_CONTRACT_METADATA.circuits].sort();
    expect(documented).toEqual(generated);
  });

  it('documents all public circuits from the compact source', () => {
    expect(NOVA_CONTRACT_METADATA.circuits).toContain('attest');
    expect(NOVA_CONTRACT_METADATA.circuits).toContain('registerCredential');
    expect(NOVA_CONTRACT_METADATA.circuits).toContain('initialize');
  });
});
