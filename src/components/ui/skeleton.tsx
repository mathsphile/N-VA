import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="surface rounded-2xl p-5">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-2 h-5 w-40" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
