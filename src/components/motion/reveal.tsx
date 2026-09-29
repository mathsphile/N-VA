'use client';

import { motion, type Variants, type Variant } from 'framer-motion';
import * as React from 'react';

export const EASE = [0.22, 1, 0.36, 1] as const;

const hidden: Variant = { opacity: 0, y: 18 };
const visible = (delay: number): Variant => ({
  opacity: 1,
  y: 0,
  transition: { duration: 0.6, ease: EASE, delay },
});

/** Scroll-reveal wrapper. Honors prefers-reduced-motion via CSS guard. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'span' | 'li';
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden, visible: visible(delay) }}
    >
      {children}
    </Comp>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
