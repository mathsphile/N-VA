'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EASE } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

const DATA = ['Name', 'Date of birth', 'University', 'Country', 'Student ID', 'Application history'];
const CLAIMS = ['Student ✓', 'Age > 18 ✓', 'Eligible ✓', 'Unique ✓'];

type Stage = 0 | 1 | 2;

/**
 * Signature animation: raw personal data is consumed by the circuit and
 * only boolean claims emerge. Loops automatically; replay on demand.
 */
export function DataProofFlow() {
  const [stage, setStage] = useState<Stage>(0);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const run = useCallback(() => {
    clearTimers();
    setStage(0);
    setPlaying(true);
    timers.current.push(window.setTimeout(() => setStage(1), 900));
    timers.current.push(window.setTimeout(() => setStage(2), 2400));
    timers.current.push(window.setTimeout(() => setPlaying(false), 5200));
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimers();
    };
  }, [run]);

  return (
    <div ref={hostRef} className="surface relative overflow-hidden rounded-2xl p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">
          Data → Circuit → Proof
        </p>
        <button
          onClick={run}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-fog-500 transition-colors hover:border-line-bright hover:text-fog-200"
        >
          <RotateCcw className="size-3" />
          Replay
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        {/* private data column */}
        <div>
          <p className="mb-4 text-[13px] font-medium text-fog-400">Private data</p>
          <ul className="space-y-2">
            {DATA.map((label, i) => (
              <motion.li
                key={label}
                animate={
                  stage === 0
                    ? { opacity: 1, x: 0 }
                    : stage === 1
                      ? { opacity: 0.25, x: 24, filter: 'blur(2px)' }
                      : { opacity: 0, x: 48, filter: 'blur(4px)' }
                }
                transition={{ duration: 0.5, ease: EASE, delay: stage === 0 ? i * 0.05 : 0 }}
                className="flex items-center gap-2.5 rounded-lg border border-line bg-ink-900/70 px-3.5 py-2.5 text-[13px] text-fog-300"
              >
                <span className={cn('size-1.5 rounded-full', stage < 2 ? 'bg-fog-600' : 'bg-transparent')} />
                {label}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* circuit */}
        <div className="flex justify-center lg:px-4">
          <motion.div
            animate={{ scale: stage === 1 ? 1.06 : 1 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative flex size-36 items-center justify-center rounded-full sm:size-40"
          >
            <div
              className={cn(
                'absolute inset-0 rounded-full border transition-colors duration-700',
                stage === 1 ? 'border-nova-400/70 shadow-[0_0_40px_-8px_rgba(110,103,245,0.5)]' : 'border-line',
              )}
            />
            <div className="absolute inset-3 rounded-full border border-line" />
            <AnimatePresence mode="wait">
              {stage < 2 ? (
                <motion.span
                  key="lock"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-1.5 text-nova-300"
                >
                  <Lock className={cn('size-6 transition-colors', stage === 1 && 'text-nova-200')} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-fog-600">
                    circuit
                  </span>
                </motion.span>
              ) : (
                <motion.span
                  key="out"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="flex flex-col items-center gap-1.5 text-ok"
                >
                  <Check className="size-6" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-fog-600">
                    sealed
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
            {stage === 1 &&
              [0, 1, 2].map((n) => (
                <motion.span
                  key={n}
                  className="absolute size-1 rounded-full bg-nova-300"
                  initial={{ x: -70, opacity: 0 }}
                  animate={{ x: [ -70, 0, 70 ], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: n * 0.25, ease: 'easeInOut' }}
                />
              ))}
          </motion.div>
        </div>

        {/* proof column */}
        <div>
          <p className="mb-4 text-right text-[13px] font-medium text-fog-400 lg:text-left">The proof</p>
          <ul className="space-y-2">
            {CLAIMS.map((label, i) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -16 }}
                animate={stage === 2 ? { opacity: 1, x: 0 } : { opacity: 0.12, x: -16 }}
                transition={{ duration: 0.45, ease: EASE, delay: stage === 2 ? i * 0.09 : 0 }}
                className="flex items-center justify-between rounded-lg border border-line bg-ink-900/70 px-3.5 py-2.5 font-mono text-[13px]"
              >
                <span className="text-fog-200">{label.replace(' ✓', '')}</span>
                <span className="text-ok">✓</span>
              </motion.li>
            ))}
          </ul>
          <motion.p
            animate={{ opacity: stage === 2 && !playing ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="mt-4 text-[13px] text-fog-500"
          >
            The verifier receives four booleans and a Midnight attestation. Nothing else exists on the wire.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
