/**
 * NØVA Policy Engine — natural language → structured verification policy.
 *
 * Hard architectural rule: the policy layer (human intent → requirement
 * ids) has NO cryptographic authority. Whatever comes out of here is an
 * untrusted *input* to the verification engine, validated against a
 * closed vocabulary. The AI never decides whether a proof is valid.
 *
 *   Natural language → Qwen (or local parser) → validated RequirementId[]
 *                  → NØVA verification engine → Midnight → private proof
 */

import type { RequirementId } from '../midnight/types';

export const KNOWN_REQUIREMENTS: readonly RequirementId[] = [
  'student',
  'age_18',
  'region_eligible',
  'unique_applicant',
  'developer',
  'hackathon_participant',
  'employment_verified',
  'grant_eligible',
  'reputation_gt_750',
  'projects_gte_3',
  'hackathons_gte_5',
];

export interface PolicyResult {
  requirements: RequirementId[];
  notes: string;
  source: 'qwen' | 'local';
}

export function isRequirementId(value: unknown): value is RequirementId {
  return typeof value === 'string' && (KNOWN_REQUIREMENTS as readonly string[]).includes(value);
}

export function validateRequirements(values: readonly string[]): RequirementId[] {
  const seen = new Set<RequirementId>();
  for (const v of values) {
    if (isRequirementId(v)) seen.add(v);
    else throw new Error(`Unknown requirement in policy: ${String(v)}`);
  }
  return [...seen];
}

/* ---------------- deterministic local parser ---------------- */

interface Rule {
  id: RequirementId;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  { id: 'student', patterns: [/\bstudents?\b/i, /\benrolled\b/i, /\buniversity\b/i, /\bcollege\b/i] },
  { id: 'age_18', patterns: [/\b(over|at least|18\+|>=\s*18|18 years|adult)\b/i, /\bage\s*[>=]\s*18\b/i] },
  { id: 'region_eligible', patterns: [/\b(eligible|eligible) (country|region|residen\w+)\b/i, /\bcountry eligibility\b/i, /\bin (india|us|usa|germany|uk|brazil|singapore|japan|canada|australia|france)\b/i] },
  { id: 'unique_applicant', patterns: [/\bunique\b/i, /\b(one|1) (person|applicant|entry|claim)\b/i, /\bnot (already|have) (claimed|received|applied)\b/i, /\bhaven.?t received\b/i, /\banti-?sybil\b/i, /\bonce per (person|applicant)\b/i] },
  { id: 'developer', patterns: [/\bdevelopers?\b/i, /\bbuilders?\b/i, /\bcoding\b/i] },
  { id: 'hackathon_participant', patterns: [/\bhackathons? (participant|attended|participated|took part)\b/i, /\bparticipated in .*hackathon/i] },
  { id: 'employment_verified', patterns: [/\bemploy(ment|ed)\b/i, /\bfull-?time\b/i, /\bjob verified\b/i] },
  { id: 'grant_eligible', patterns: [/\bgrant[- ]eligible\b/i, /\beligible for (this |the )?grant\b/i] },
  { id: 'reputation_gt_750', patterns: [/\breputation\s*(score\s*)?[>≥]\s*\d+/i, /\bhigh reputation\b/i, /\breputation of \d+/i] },
  { id: 'projects_gte_3', patterns: [/\b(at least \d+|[3-9]|\d+)\s*(verified |shipped )?projects?\b/i, /\bprojects?\s*[>=]\s*\d+/i] },
  { id: 'hackathons_gte_5', patterns: [/\b(at least \d+|[5-9]|\d{2,})\s*hackathons?\b/i, /\bhackathons?\s*[>=]\s*\d+/i] },
];

export function parsePolicyLocally(text: string): PolicyResult {
  const requirements = validateRequirements(
    RULES.filter((r) => r.patterns.some((p) => p.test(text))).map((r) => r.id),
  );
  return {
    requirements,
    notes:
      requirements.length === 0
        ? 'No supported requirements detected. Try naming credentials (student, developer), an age limit, a region, or a uniqueness rule.'
        : `Detected ${requirements.length} requirement${requirements.length === 1 ? '' : 's'} using the local rule parser.`,
    source: 'local',
  };
}
