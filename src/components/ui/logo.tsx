import { cn } from '@/lib/utils';

/** NØVA brandmark: a sealed aperture — the void Ø as the private core. */
export function Logo({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <path
        d="M12 2.2 20.4 7v10L12 21.8 3.6 17V7L12 2.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.4" opacity="0.9" />
      <path d="M15.2 8.8 8.8 15.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-[0.12em] text-fog-100', className)}>
      NØVA
    </span>
  );
}
