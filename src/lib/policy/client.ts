/**
 * Browser-safe surface of the policy layer (no Qwen client here —
 * that lives behind the /api/policy route on the server).
 */

import { KNOWN_REQUIREMENTS, parsePolicyLocally } from './policy';
import type { PolicyResult } from './policy';

export { KNOWN_REQUIREMENTS, parsePolicyLocally };
export type { PolicyResult };

export type PolicyResponse =
  | PolicyResult
  | { error: string };
