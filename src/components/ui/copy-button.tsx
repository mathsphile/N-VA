'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function CopyButton({ value, className, label = 'Copy link' }: { value: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12px] text-fog-500 transition-colors hover:border-line-bright hover:text-fog-200',
        className,
      )}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
