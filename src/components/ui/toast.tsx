'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useNova } from '@/lib/store';
import { cn } from '@/lib/utils';

const ICONS = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
} as const;

function ToastCard({ id, title, description, tone }: { id: number; title: string; description?: string; tone: 'default' | 'success' | 'error' }) {
  const dismiss = useNova((s) => s.dismissToast);
  const Icon = ICONS[tone];
  useEffect(() => {
    const t = setTimeout(() => dismiss(id), 4500);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      className={cn(
        'pointer-events-auto flex w-[min(92vw,380px)] items-start gap-3 surface-bright rounded-xl p-4 shadow-xl shadow-black/50 backdrop-blur-md',
        tone === 'success' && 'border-ok/25',
        tone === 'error' && 'border-bad/30',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'success' ? 'text-ok' : tone === 'error' ? 'text-bad' : 'text-nova-300',
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-fog-100">{title}</p>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-fog-500">{description}</p>}
      </div>
      <button
        onClick={() => dismiss(id)}
        aria-label="Dismiss notification"
        className="ml-auto text-fog-600 transition-colors hover:text-fog-300"
      >
        ×
      </button>
    </motion.div>
  );
}

export function ToastViewport() {
  const toasts = useNova((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} {...t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
