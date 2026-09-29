'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Barcode,
  Blocks,
  Fingerprint,
  Gauge,
  Lock,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ArchitectureViz } from '@/components/home/ArchitectureViz';
import { DataProofFlow } from '@/components/home/DataProofFlow';
import { ProofRunner } from '@/components/app/ProofRunner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Reveal, Stagger, staggerItem, EASE } from '@/components/motion/reveal';
import { HACKSPIRE_GRANT_ID, getRequest } from '@/lib/requests';
import { site } from '@/lib/site';
import { cn } from '@/lib/utils';

function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('relative mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-28', className)}>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-nova-300">{children}</p>
  );
}

const HOW_STEPS = [
  {
    icon: Lock,
    title: 'Collect privately',
    body: 'Credentials from universities, communities and organizations land in an encrypted vault on your device. Attributes stay sealed.',
  },
  {
    icon: Fingerprint,
    title: 'Prove selectively',
    body: 'Pick which claims a verifier may learn. The NØVA engine runs the circuit against your vault — never your data leaving it.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified on Midnight',
    body: 'The attestation binds claims to the Compact contract. Verifiers receive booleans. No database of you exists anywhere.',
  },
];

const REPUTATION_ROWS = [
  { label: 'Developer', value: '✓' },
  { label: 'Verified projects', value: '8' },
  { label: 'Hackathons', value: '12' },
  { label: 'Reputation', value: '> 750' },
];

const USE_CASES = ['Grants', 'Airdrops', 'Hackathons', 'Community rewards', 'Public goods', 'Private voting'];

function SealedCredential({ label, issuer }: { label: string; issuer: string }) {
  const [peeking, setPeeking] = useState(false);
  const scrambled = '•••••'.repeat(3);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onMouseEnter={() => setPeeking(true)}
      onMouseLeave={() => setPeeking(false)}
      transition={{ duration: 0.25, ease: EASE }}
      className="surface group relative overflow-hidden rounded-xl p-5"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-600">◈ credential</span>
        <BadgeCheck className="size-4 text-nova-300" />
      </div>
      <p className="mt-3 text-[15px] font-medium">{label}</p>
      <p className="text-[13px] text-fog-500">{issuer}</p>
      <div className="mt-4 h-5 overflow-hidden rounded-md border border-line bg-ink-900">
        <motion.span
          key={peeking ? 'scramble' : 'sealed'}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 1, 0.4] }}
          transition={{ duration: 0.4 }}
          className="block whitespace-nowrap px-2 font-mono text-[11px] leading-5 text-fog-700"
        >
          {scrambled}
        </motion.span>
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-nova-400/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}

const CODE_EXAMPLE = `const proof = await nova.generateProof({
  request: "req_hackspire_grant",
  credentials: await vault.unlock(),   // sealed, local
});

await proof.submit();                   // claims only

// verifier receives:
// { verified: true,
//   claims: { student: true, age_18: true, ... },
//   attestation: "9f3c…a2", mode: "ledger" }`;

export function Landing() {
  const grantRequest = getRequest(HACKSPIRE_GRANT_ID);

  return (
    <>
      {/* 3 — interactive proof demo */}
      <Section id="try">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Try the core flow</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Prove the claim. Hide the data.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
            This is the real NØVA proof engine running in your browser. Generate a private proof for
            a live grant requirement set — nothing about you is transmitted.
          </p>
        </Reveal>
        {grantRequest && (
          <Reveal delay={0.1} className="mx-auto mt-12 max-w-2xl">
            <ProofRunner request={grantRequest} />
          </Reveal>
        )}
      </Section>

      {/* 4 — how it works */}
      <div className="section-glow border-y border-line">
        <Section id="proof">
          <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.4fr]">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <Eyebrow>How NØVA works</Eyebrow>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  From data → proof
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
                  Raw attributes enter the circuit. Everything unnecessary disappears. What exits is
                  a set of boolean claims and a Midnight attestation.
                </p>
                <div className="mt-8 space-y-4">
                  {HOW_STEPS.map((s, i) => (
                    <Reveal key={s.title} delay={i * 0.08}>
                      <div className="flex gap-4 rounded-xl border border-line bg-ink-950/60 p-4">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-nova-500/10 text-nova-300">
                          <s.icon className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-fog-500">{s.body}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <DataProofFlow />
            </Reveal>
          </div>
        </Section>
      </div>

      {/* 5 — private credentials */}
      <Section id="credentials">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Private identity vault</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Credentials that stay encrypted at rest
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
              Your vault holds student status, age brackets, community memberships — as sealed
              objects. On hover you see what a stranger sees: nothing but the shape of a claim.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-fog-400">
              <li className="flex items-center gap-3"><Lock className="size-4 text-nova-300" /> AES-GCM vault bound to this device</li>
              <li className="flex items-center gap-3"><Barcode className="size-4 text-nova-300" /> Only commitments are exposed — keyed like the on-chain circuit</li>
              <li className="flex items-center gap-3"><ScanEye className="size-4 text-nova-300" /> No attribute is ever readable by NØVA or any verifier</li>
            </ul>
            <Link href="/dashboard/credentials" className="mt-8 inline-block">
              <Button variant="secondary">
                Open the vault <ArrowRight className="size-4" />
              </Button>
            </Link>
          </Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-2">
            <motion.div variants={staggerItem}><SealedCredential label="Student" issuer="Issued by FIEM" /></motion.div>
            <motion.div variants={staggerItem}><SealedCredential label="Age > 18" issuer="Issued by Registrar" /></motion.div>
            <motion.div variants={staggerItem}><SealedCredential label="Developer" issuer="Midnight Dev Guild" /></motion.div>
            <motion.div variants={staggerItem}><SealedCredential label="Hackathon participant" issuer="HackSpire" /></motion.div>
          </Stagger>
        </div>
      </Section>

      {/* 6 — private reputation */}
      <div className="border-y border-line bg-ink-950/60">
        <Section id="reputation">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <div className="surface mx-auto max-w-sm rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">Private reputation</span>
                  <Gauge className="size-4 text-nova-300" />
                </div>
                <div className="mt-5 space-y-2.5">
                  {REPUTATION_ROWS.map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-lg border border-line bg-ink-900/70 px-4 py-3">
                      <span className="text-sm text-fog-300">{row.label}</span>
                      <span className={cn('font-mono text-sm', row.value.includes('>') ? 'text-nova-200' : 'text-ok')}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <p className="text-[12px] text-fog-600">Prove the threshold. Never the profile.</p>
                </div>
                <Button size="sm" variant="secondary" className="mt-4 w-full" asChild>
                  <Link href="/dashboard/reputation">Generate reputation proof</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <Eyebrow>Private reputation</Eyebrow>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Your history works for you. Silently.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
                Accumulate verifiable credentials from hackathons, universities, open-source
                communities and certifications. Prove “reputation over 750” or “at least 3 verified
                projects” — without exposing your complete profile to anyone.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {['Hackathons', 'Universities', 'Dev communities', 'Open source', 'Certifications', 'Events'].map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </Reveal>
          </div>
        </Section>
      </div>

      {/* 7 — anti sybil */}
      <Section id="anti-sybil">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>One person. One proof.</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Uniqueness without a public identity system
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
              Prove you haven&apos;t already claimed this reward — and prove nothing else. A
              scope-bound attestation is recorded; a second attempt from the same holder cannot
              pass the circuit. No name, no wallet graph, no surveillance.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {USE_CASES.map((u) => (
                <div key={u} className="flex items-center gap-2 rounded-lg border border-line bg-ink-950/60 px-3 py-2.5 text-[13px] text-fog-300">
                  <Fingerprint className="size-3.5 shrink-0 text-nova-400" />
                  {u}
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="surface relative overflow-hidden rounded-2xl p-8">
              <div className="space-y-6">
                {[
                  { who: 'Applicant A', ok: true, note: 'attestation sealed · first claim for this scope' },
                  { who: 'Applicant B', ok: false, note: 'rejected · uniqueness already proven for this person in this scope' },
                  { who: 'Applicant C', ok: true, note: 'attestation sealed · first claim for this scope' },
                ].map((row) => (
                  <div key={row.who} className="flex items-center gap-4 rounded-xl border border-line bg-ink-900/70 p-4">
                    <span className={cn('flex size-9 items-center justify-center rounded-full', row.ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad')}>
                      {row.ok ? <ShieldCheck className="size-4" /> : <Lock className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fog-200">{row.who}</p>
                      <p className="truncate font-mono text-[11px] text-fog-600">{row.note}</p>
                    </div>
                    <span className={cn('ml-auto font-mono text-[11px] uppercase tracking-widest', row.ok ? 'text-ok' : 'text-bad')}>
                      {row.ok ? 'ok' : 'dup'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-fog-700">
                same scope · distinct holders · zero identities
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 8 — grant use case */}
      <div className="border-y border-line bg-ink-950/60">
        <Section id="grant">
          <div className="grid items-center gap-14 lg:grid-cols-[1.2fr_0.8fr]">
            <Reveal>
              <Eyebrow>Private grants</Eyebrow>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                The HackSpire grant — applied to privately
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fog-500">
                A student needs to prove four things and reveal none of them. This is the exact
                production flow — wallet, requirements, circuit, attestation — compressed into ten
                seconds.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {['Connect wallet', 'Review requirements', 'Generate proof', 'Midnight verification', 'Eligible ✓'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2 text-[13px] text-fog-400">
                    {i > 0 && <span className="text-fog-700">→</span>}
                    {s}
                  </span>
                ))}
              </div>
              <Link href="/grant" className="mt-8 inline-block">
                <Button size="lg">
                  Apply privately
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="surface rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="size-5 text-nova-300" />
                  <div>
                    <p className="text-sm font-medium">NØVA Grant</p>
                    <p className="text-[12px] text-fog-600">HackSpire Foundation</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {['Student', 'Age > 18', 'Eligible region', 'Unique applicant'].map((r) => (
                    <div key={r} className="flex items-center justify-between rounded-lg border border-line bg-ink-900/70 px-3.5 py-2.5 text-sm">
                      <span className="text-fog-300">{r}</span>
                      <CheckMark />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-fog-600">
                  estimated verification · {'<'} 10s
                </p>
              </div>
            </Reveal>
          </div>
        </Section>
      </div>

      {/* 9 — architecture */}
      <Section id="architecture">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Security architecture</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Where your data goes — nowhere
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
            Follow the particle. Witness data enters the circuit at the holder&apos;s edge; only
            commitments and attestations traverse Midnight.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-14">
          <ArchitectureViz />
        </Reveal>
      </Section>

      {/* 10 — privacy principles */}
      <div className="border-y border-line bg-ink-950/60">
        <Section id="security">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <Eyebrow>Privacy model</Eyebrow>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-[2.4rem]">
                Privacy is not a setting. It&apos;s the architecture.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
                NØVA is not an identity database. The system is designed so that a breach of any
                single component — ours, a verifier&apos;s, a relay&apos;s — yields nothing about
                any person.
              </p>
            </Reveal>
            <Stagger className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Blocks, title: 'Minimize data', body: 'Nothing personal is ever stored server-side. There is no table to breach.' },
                { icon: Lock, title: 'Keep data private', body: 'Vaults are encrypted with device-bound keys. Only circuits touch plaintext.' },
                { icon: Fingerprint, title: 'Generate proof', body: 'Claims are computed locally; commitments are domain-separated per circuit.' },
                { icon: ScanEye, title: 'Reveal minimum', body: 'A verifier sees booleans and an attestation fingerprint. Structurally nothing else.' },
              ].map((p) => (
                <motion.div
                  key={p.title}
                  variants={staggerItem}
                  className="surface rounded-xl p-5"
                >
                  <p.icon className="size-4 text-nova-300" />
                  <p className="mt-3 text-sm font-medium">{p.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-fog-500">{p.body}</p>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </Section>
      </div>

      {/* 11 — developers */}
      <Section id="developers">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Developer platform</Eyebrow>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Four calls from policy to private proof
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
              Issue credentials, define a policy, generate a proof, verify on Midnight. The policy
              engine can be AI-assisted — the cryptography never is.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/developers">
                <Button variant="secondary">
                  <Terminal className="size-4" />
                  Read the docs
                </Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <pre className="surface overflow-x-auto rounded-2xl p-6 font-mono text-[12.5px] leading-relaxed text-fog-300">
              <code>{CODE_EXAMPLE}</code>
            </pre>
          </Reveal>
        </div>
      </Section>

      {/* 12 — closing CTA */}
      <Section className="pb-32 text-center">
        <Reveal>
          <div className="mx-auto max-w-2xl">
            <Sparkles className="mx-auto size-6 text-nova-300" />
            <h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
              Verification without unnecessary disclosure.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fog-500">
              Your identity doesn&apos;t need to be public to be useful.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href={site.links.dashboard}>
                <Button size="lg">Start with NØVA</Button>
              </Link>
              <Link href={site.links.demo}>
                <Button size="lg" variant="secondary">
                  <Users className="size-4" />
                  Launch guided demo
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

function CheckMark() {
  return <BadgeCheck className="size-4 text-ok" />;
}
