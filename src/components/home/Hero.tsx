'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EASE } from '@/components/motion/reveal';
import { site } from '@/lib/site';

const VaultScene = dynamic(() => import('@/components/scene/VaultScene'), {
  ssr: false,
  loading: () => <VaultFallback />,
});

function VaultFallback() {
  return (
    <div className="flex items-center justify-center">
      <div className="size-52 rounded-full border border-nova-400/20 bg-nova-500/5 blur-[1px]">
        <div className="scanline h-px w-full bg-gradient-to-r from-transparent via-nova-300/70 to-transparent" />
      </div>
    </div>
  );
}

export function Hero() {
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const evaluate = () => setShow3D(desktop.matches && !reduced.matches);
    evaluate();
    desktop.addEventListener('change', evaluate);
    reduced.addEventListener('change', evaluate);
    return () => {
      desktop.removeEventListener('change', evaluate);
      reduced.removeEventListener('change', evaluate);
    };
  }, []);

  return (
    <section className="hero-glow relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-nova-400/40 to-transparent" />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-900/80 px-3.5 py-1.5 text-[12px] text-fog-400"
          >
            <span className="size-1.5 rounded-full bg-nova-400" aria-hidden />
            Private proof network · powered by Midnight
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-6 text-balance text-[clamp(2.6rem,6.2vw,4.4rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-white"
          >
            Your data stays yours.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
            className="mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-fog-400"
          >
            NØVA lets you prove eligibility, reputation, and uniqueness without revealing the
            information behind the proof.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href={site.links.dashboard}>
              <Button size="lg">
                Start with NØVA
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href={site.links.demo}>
              <Button size="lg" variant="secondary">
                <Play className="size-3.5" />
                See how it works
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-12 flex flex-wrap gap-x-10 gap-y-3 text-[13px] text-fog-600"
          >
            <span>
              <span className="font-mono text-fog-300">0</span> personal attributes revealed
            </span>
            <span>
              <span className="font-mono text-fog-300">&lt;10s</span> proof generation
            </span>
            <span>
              <span className="font-mono text-fog-300">1</span> person · <span className="font-mono text-fog-300">1</span> proof
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
          className="relative mx-auto aspect-square w-full max-w-[460px]"
          aria-label="Animated visualization of an encrypted credential vault"
          role="img"
        >
          <div className="absolute inset-[12%] rounded-full bg-nova-500/10 blur-3xl" aria-hidden />
          {show3D ? <VaultScene /> : <VaultFallback />}
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-700">
              private vault · commitments only leave the device
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
