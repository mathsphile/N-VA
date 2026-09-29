'use client';

/**
 * PolicyComposer — natural language → structured requirements.
 *
 * Calls /api/policy (Qwen when configured, deterministic local parser
 * otherwise). The output is a *suggestion*: every id is validated
 * client-side against the closed catalog and shown as editable
 * checkboxes. Cryptography happens elsewhere, always.
 */

import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import type { PolicyResponse } from '@/lib/policy/client';
import { useToastApi } from '@/lib/store';

export function PolicyComposer({ onApply }: { onApply: (requirements: string[]) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToastApi();

  const compile = async () => {
    if (text.trim().length < 8) {
      toast.error('Describe the policy first', 'e.g. “students over 18 who haven’t claimed this grant”.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as PolicyResponse;
      if (!res.ok || 'error' in data) {
        throw new Error('error' in data && data.error ? data.error : 'Policy compilation failed.');
      }
      const valid = data.requirements;
      if (valid.length === 0) {
        toast.info('No requirements detected', data.notes || 'Rephrase with clearer eligibility terms.');
        return;
      }
      onApply(valid);
      toast.success('Policy compiled', `${data.source === 'qwen' ? 'Qwen' : 'Local parser'} → ${valid.length} requirements · review before publishing`);
    } catch (e) {
      toast.error('Policy engine unavailable', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface rounded-xl p-5" id="policy">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-nova-300" />
          Policy engine
        </p>
        <Badge tone="neutral">NL → structured · no crypto authority</Badge>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-fog-500">
        Describe eligibility in plain language. The model only classifies intent — the verification
        engine decides truth.
      </p>
      <Textarea
        className="mt-4"
        placeholder="I want applicants who are students, at least 18 years old, and haven’t received this grant before."
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Natural language policy"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-fog-700">Qwen is optional · falls back to a deterministic local parser</p>
        <Button size="sm" variant="secondary" onClick={compile} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Compile policy
        </Button>
      </div>
    </div>
  );
}
