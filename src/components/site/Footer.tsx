import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { site } from '@/lib/site';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Product',
    links: [
      { label: 'Private vault', href: '/dashboard/credentials' },
      { label: 'Proof generator', href: '/dashboard' },
      { label: 'Private reputation', href: '/#reputation' },
      { label: 'One Person. One Proof.', href: '/#anti-sybil' },
      { label: 'Grant demo', href: '/grant' },
    ],
  },
  {
    title: 'Organizations',
    links: [
      { label: 'Create a verification', href: '/dashboard/requests' },
      { label: 'Launch demo', href: '/demo' },
      { label: 'Policy engine', href: '/dashboard/requests#policy' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Platform overview', href: '/developers' },
      { label: 'Credential model', href: '/developers#credentials' },
      { label: 'Verification flow', href: '/developers#verification' },
      { label: 'Midnight integration', href: '/developers#midnight' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-nova-300">
            <Logo size={22} />
            <span className="text-[15px] font-semibold tracking-[0.12em]">NØVA</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog-500">
            {site.tagline} Privacy-preserving credentials, proofs and uniqueness — built on Midnight,
            designed to never hold your data.
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-fog-700">
            Privacy is not a setting. It&apos;s the architecture.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-fog-600">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-fog-500 transition-colors hover:text-fog-100">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-[12px] text-fog-700 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} NØVA Labs. Protocol not law.</span>
          <span className="font-mono">Built on Midnight · Compact circuits · Selective disclosure</span>
        </div>
      </div>
    </footer>
  );
}
