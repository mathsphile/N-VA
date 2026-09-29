/**
 * Qwen-backed policy compiler (server-side only).
 *
 * Qwen is asked to CLASSIFY intent into a closed vocabulary of
 * requirement ids. The model output is treated as untrusted input:
 * every element is validated, and only whitelisted ids survive. If the
 * model is unavailable or emits junk, callers fall back to the
 * deterministic local parser — a policy mis-parse can never fabricate
 * a verification.
 */

import 'server-only';
import { parsePolicyLocally, validateRequirements, type PolicyResult } from './policy';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function extractJson(text: string): { requirements?: unknown } | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as { requirements?: unknown };
  } catch {
    return null;
  }
}

export function qwenConfigured(): boolean {
  return Boolean(process.env.QWEN_API_KEY);
}

export async function parsePolicyWithQwen(text: string): Promise<PolicyResult> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error('QWEN_API_KEY is not configured');
  const baseUrl = process.env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = process.env.QWEN_MODEL ?? 'qwen-plus';

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You compile verification policies for NØVA, a private proof network. ' +
            'Given a natural-language policy, output ONLY a JSON object {"requirements": [ ...ids ]} ' +
            'using ids from this closed list: student, age_18, region_eligible, unique_applicant, ' +
            'developer, hackathon_participant, employment_verified, grant_eligible, reputation_gt_750, ' +
            'projects_gte_3, hackathons_gte_5. Never invent ids. "haven\'t received this grant before" maps ' +
            'to unique_applicant. No explanations.',
        },
        { role: 'user', content: text },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Qwen API responded ${res.status}`);
  }
  const json = (await res.json()) as ChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content ?? '';
  const parsed = extractJson(content);
  const raw = Array.isArray(parsed?.requirements)
    ? (parsed!.requirements as unknown[]).map(String)
    : [];
  const requirements = validateRequirements(raw);
  return {
    requirements,
    notes: `Compiled by ${model}. Each id was validated against NØVA's closed requirement vocabulary.`,
    source: 'qwen',
  };
}

/** Route-level entry: prefer Qwen when configured, degrade to local. */
export async function parsePolicy(text: string): Promise<PolicyResult> {
  if (!text.trim()) return parsePolicyLocally(text);
  if (!qwenConfigured()) return parsePolicyLocally(text);
  try {
    return await parsePolicyWithQwen(text);
  } catch {
    const local = parsePolicyLocally(text);
    return {
      ...local,
      notes: `Qwen unreachable — ${local.notes.toLowerCase()}`,
    };
  }
}
