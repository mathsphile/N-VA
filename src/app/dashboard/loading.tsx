import { Logo } from '@/components/ui/logo';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32 text-fog-500">
      <Logo size={26} className="animate-pulse text-nova-400" />
      <p className="font-mono text-[11px] uppercase tracking-[0.3em]">decrypting local vault…</p>
    </div>
  );
}
