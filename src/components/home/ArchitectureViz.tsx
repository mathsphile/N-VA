'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const NODES = ['User', 'Private credentials', 'NØVA proof engine', 'Midnight', 'Verifier'];

function ParticleTrack({ dim }: { dim: boolean }) {
  return (
    <div className="relative mx-auto h-8 w-px" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-line via-nova-400/30 to-line" />
      <motion.span
        className="absolute left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-nova-300 shadow-[0_0_8px_2px_rgba(139,134,250,0.5)]"
        animate={{ top: ['0%', '100%'], opacity: [0, dim ? 1 : 0.4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: dim ? 0.8 : 0 }}
      />
    </div>
  );
}

/**
 * Security visualization: data only travels down as commitments; the
 * verifier receives the attested result. The "no exit" channel from the
 * credentials node makes the privacy property explicit.
 */
export function ArchitectureViz() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p + 1) % NODES.length), 1300);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-md">
      {NODES.map((label, i) => {
        const active = i === pulse;
        const isCredentials = label === 'Private credentials';
        return (
          <div key={label}>
            <motion.div
              animate={{ scale: active ? 1.02 : 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex items-center justify-between rounded-xl border px-4 py-3.5 ${
                active ? 'border-nova-400/50 bg-nova-500/10' : 'border-line bg-ink-900/60'
              }`}
            >
              <span className={`text-sm font-medium ${active ? 'text-white' : 'text-fog-400'}`}>{label}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-fog-600">
                {i === 0 ? 'witness' : i === NODES.length - 1 ? 'claims only' : 'circuit'}
              </span>
              {isCredentials && (
                <div className="absolute -right-28 top-1/2 hidden w-24 -translate-y-1/2 sm:block">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-fog-700">
                    <span className="h-px w-8 bg-line" />
                    <span className="text-bad/70">✕ data exit</span>
                  </div>
                </div>
              )}
            </motion.div>
            {i < NODES.length - 1 && <ParticleTrack dim={pulse >= i} />}
          </div>
        );
      })}
    </div>
  );
}
