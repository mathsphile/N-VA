import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Footer } from '@/components/site/Footer';
import { Navbar } from '@/components/site/Navbar';
import { Providers } from '@/components/site/Providers';
import { site } from '@/lib/site';
import './globals.css';

// Self-hosted (see fonts/README.md): `next/font/google` fetched these at build
// time and, when that fetch came back odd, the loader threw
// `Cannot read properties of null` inside @next/font/dist/google/loader.js and
// failed `next build`. A build must not depend on a third party being reachable.
const inter = localFont({
  src: [{ path: './fonts/Inter-latin.woff2', weight: '100 900', style: 'normal' }],
  display: 'swap',
  variable: '--font-inter',
});
const mono = localFont({
  src: [{ path: './fonts/JetBrainsMono-latin.woff2', weight: '400 700', style: 'normal' }],
  display: 'swap',
  variable: '--font-mono-jb',
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    'NØVA',
    'Midnight Network',
    'private proofs',
    'selective disclosure',
    'credentials',
    'anti-sybil',
    'privacy',
    'Compact',
  ],
  openGraph: {
    title: `${site.name} — Private Proof Network`,
    description: site.description,
    siteName: site.name,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: site.name, description: site.tagline },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#050507',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="grain min-h-dvh bg-ink-1000 text-fog-100 antialiased">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-ink-800 focus:px-4 focus:py-2 focus:text-sm"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
