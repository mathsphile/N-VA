'use client';

import { motion } from 'framer-motion';
import { Link2, WalletMinimal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ModeBadge } from '@/components/site/ModeBadge';
import { Button } from '@/components/ui/button';
import { Logo, Wordmark } from '@/components/ui/logo';
import { EASE } from '@/components/motion/reveal';
import { truncateAddress } from '@/lib/midnight/wallet';
import { useNova } from '@/lib/store';
import { NAV_LINKS, site } from '@/lib/site';
import { cn } from '@/lib/utils';

export function WalletButton() {
  const wallet = useNova((s) => s.wallet);
  const status = useNova((s) => s.walletStatus);
  const openModal = useNova((s) => s.setWalletModalOpen);

  if (wallet) {
    return (
      <button
        onClick={() => openModal(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-ink-900 px-3 text-[13px] font-medium text-fog-300 transition-colors hover:border-line-bright hover:text-fog-100"
      >
        <span className="size-1.5 rounded-full bg-ok" aria-hidden />
        <span className="font-mono">{wallet.address ? truncateAddress(wallet.address) : wallet.providerName}</span>
      </button>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => openModal(true)}
      disabled={status === 'connecting'}
    >
      <WalletMinimal className="size-3.5" />
      {status === 'connecting' ? 'Connecting…' : 'Connect wallet'}
    </Button>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        scrolled || mobileOpen
          ? 'border-b border-line bg-ink-1000/85 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8"
      >
        <Link href="/" className="flex items-center gap-2.5 text-nova-300" aria-label={`${site.name} home`}>
          <Logo size={22} />
          <Wordmark className="text-[15px]" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-[13px] text-fog-500 transition-colors hover:text-fog-100"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <ModeBadge />
          <Link href={site.links.demo}>
            <Button variant="ghost" size="sm">
              <Link2 className="size-3.5" />
              Launch demo
            </Button>
          </Link>
          <WalletButton />
          <Link href={site.links.dashboard}>
            <Button size="sm">Open vault</Button>
          </Link>
        </div>

        <button
          className="ml-auto flex size-10 items-center justify-center rounded-lg text-fog-300 md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="relative block h-3.5 w-5">
            <span
              className={cn(
                'absolute left-0 top-0 h-px w-full bg-current transition-transform duration-200',
                mobileOpen && 'top-1/2 rotate-45',
              )}
            />
            <span
              className={cn(
                'absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current transition-opacity duration-200',
                mobileOpen && 'opacity-0',
              )}
            />
            <span
              className={cn(
                'absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-200',
                mobileOpen && 'bottom-1/2 -rotate-45',
              )}
            />
          </span>
        </button>
      </nav>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-line bg-ink-1000/95 px-5 pb-6 pt-3 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-[15px] text-fog-300 hover:bg-ink-850"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={site.links.demo}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-[15px] text-fog-300 hover:bg-ink-850"
            >
              Launch demo
            </Link>
            <Link
              href={site.links.dashboard}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-[15px] text-fog-300 hover:bg-ink-850"
            >
              Open vault
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <ModeBadge />
            <WalletButton />
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
