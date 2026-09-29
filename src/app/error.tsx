'use client';

import { ShieldX } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[NØVA]', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-line bg-ink-900 text-bad">
        <ShieldX className="size-5" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Something broke quietly</h1>
      <p className="mt-2 text-sm leading-relaxed text-fog-500">
        The vault and your credentials are unaffected — nothing personal is ever sent, so nothing
        personal can be lost here. You can retry safely.
      </p>
      {error.digest && <p className="mt-3 font-mono text-[11px] text-fog-700">digest {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
