/**
 * Verification request repository (client-side).
 *
 * Organizations create requests; the request carries requirement ids and
 * a campaign scope only — no personal data flows through storage. In a
 * hosted deployment this module is the seam for a Postgres-backed
 * service; the interface stays identical.
 */

import { midnightConfig } from './midnight/network';
import type { ActivityItem, ProofRequest, RequirementId } from './midnight/types';
import { randomHex, shortId } from './midnight/crypto';

const REQUESTS_KEY = 'nova.requests.v1';
const ACTIVITY_KEY = 'nova.activity.v1';

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const blob = window.localStorage.getItem(key);
  if (!blob) return [];
  try {
    return JSON.parse(blob) as T[];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

function save<T>(key: string, items: T[]): void {
  window.localStorage.setItem(key, JSON.stringify(items.slice(0, 200)));
}

export function listRequests(): ProofRequest[] {
  const own = load<ProofRequest>(REQUESTS_KEY);
  return [...own, ...builtInRequests()];
}

export function getRequest(id: string): ProofRequest | undefined {
  return listRequests().find((r) => r.id === id);
}

export async function createRequest(input: {
  name: string;
  organization: string;
  description: string;
  requirements: RequirementId[];
}): Promise<ProofRequest> {
  if (!input.name.trim()) throw new Error('Verification name is required.');
  if (!input.organization.trim()) throw new Error('Organization is required.');
  if (input.requirements.length === 0) throw new Error('Select at least one requirement.');
  const request: ProofRequest = {
    id: shortId('req'),
    name: input.name.trim(),
    organization: input.organization.trim(),
    description: input.description.trim(),
    requirements: input.requirements,
    campaign: `campaign:${input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${randomHex(3)}`,
    createdAt: new Date().toISOString(),
    status: 'open',
    mode: midnightConfig().mode,
  };
  const requests = load<ProofRequest>(REQUESTS_KEY);
  requests.unshift(request);
  save(REQUESTS_KEY, requests);
  logActivity({
    kind: 'verification',
    label: `Verification “${request.name}” created`,
    status: 'Open',
  });
  return request;
}

export function fulfillRequest(id: string): void {
  const requests = load<ProofRequest>(REQUESTS_KEY);
  const builtin = builtInRequests().find((r) => r.id === id);
  if (builtin) return; // built-in demo requests live in code
  const req = requests.find((r) => r.id === id);
  if (req) {
    req.status = 'fulfilled';
    save(REQUESTS_KEY, requests);
  }
}

/* ---------------- activity log ---------------- */

export function listActivity(): ActivityItem[] {
  return load<ActivityItem>(ACTIVITY_KEY);
}

export function logActivity(item: Omit<ActivityItem, 'id' | 'at'>): ActivityItem {
  const entry: ActivityItem = { ...item, id: shortId('act'), at: new Date().toISOString() };
  const items = load<ActivityItem>(ACTIVITY_KEY);
  items.unshift(entry);
  save(ACTIVITY_KEY, items);
  return entry;
}

export function clearActivity(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVITY_KEY);
}

/* ---------------- built-in public requests ---------------- */

/* ---------------- built-in public requests ---------------- */

export const HACKSPIRE_GRANT_ID = 'req_hackspire_grant';

function builtInRequests(): ProofRequest[] {
  const mode = midnightConfig().mode;
  return [
    {
      id: HACKSPIRE_GRANT_ID,
      name: 'HackSpire Grant',
      organization: 'HackSpire Foundation',
      description:
        'Regional innovation grant for student builders. Eligibility is proven privately — four claims, zero personal attributes.',
      requirements: ['student', 'age_18', 'region_eligible', 'unique_applicant'],
      campaign: 'campaign:hackspire-grant-2026',
      createdAt: '2026-09-01T09:00:00.000Z',
      status: 'open',
      mode,
    },
    {
      id: 'req_public_goods_round2',
      name: 'Public Goods Round 4 — Voter Eligibility',
      organization: 'Public Goods Assembly',
      description: 'Private ballot eligibility: developer, reputation threshold, unique participant.',
      requirements: ['developer', 'reputation_gt_750', 'unique_applicant'],
      campaign: 'campaign:pgf-round-4',
      createdAt: '2026-09-05T09:00:00.000Z',
      status: 'open',
      mode,
    },
  ];
}
