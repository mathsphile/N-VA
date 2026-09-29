import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <Logo size={30} className="text-nova-400" />
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-fog-600">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page reveals nothing</h1>
      <p className="mt-3 text-sm leading-relaxed text-fog-500">
        The route doesn&apos;t exist — which, honestly, is the privacy model working as intended.
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/">
          <Button>Back to NØVA</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary">Open vault</Button>
        </Link>
      </div>
    </div>
  );
}
