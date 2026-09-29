import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { NOVA_CIRCUITS } from '@/lib/midnight/contracts';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Developers',
  description:
    'Issue credentials, compile policies into requirements, generate selective proofs and verify on Midnight. The NØVA developer platform.',
};

const TOC = [
  { id: 'flow', label: 'The four calls' },
  { id: 'credentials', label: 'Credential model' },
  { id: 'policy', label: 'Policy engine' },
  { id: 'verification', label: 'Verification flow' },
  { id: 'midnight', label: 'Midnight integration' },
  { id: 'events', label: 'Webhooks & events' },
];

function Code({ title, lang, code }: { title: string; lang: string; code: string }) {
  return (
    <figure className="surface overflow-hidden rounded-xl">
      <figcaption className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-mono text-[11px] text-fog-500">{title}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-fog-700">{lang}</span>
          <CopyButton value={code} label="Copy" />
        </div>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-fog-300">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-14 first:border-t-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-nova-300">{kicker}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-fog-400">{children}</div>
    </section>
  );
}

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <header className="max-w-3xl">
        <Badge tone="accent">Developer platform</Badge>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
          Verify the claim, not the data.
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-fog-500">
          NØVA is a selective-disclosure proof layer over Midnight. Issue credentials, express an
          eligibility policy as requirement ids, generate proofs on the applicant&apos;s device and
          verify attestations on-chain. Your backend never holds personal data — there is nothing to
          breach.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/dashboard/requests">
            <Button>
              Create a verification <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href={site.links.demo}>
            <Button variant="secondary">Run the demo flow</Button>
          </Link>
        </div>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Developer docs" className="hidden lg:block">
          <div className="sticky top-28 space-y-1 border-l border-line pl-4">
            {TOC.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="block py-1.5 text-[13px] text-fog-500 transition-colors hover:text-fog-100">
                {t.label}
              </a>
            ))}
          </div>
        </nav>

        <div>
          <Section id="flow" kicker="Overview" title="The four calls">
            <div className="grid gap-2 sm:grid-cols-4">
              {['Issue credential', 'Define policy', 'Generate proof', 'Verify on Midnight'].map((s, i) => (
                <div key={s} className="surface rounded-lg px-3.5 py-3 text-center">
                  <span className="font-mono text-[11px] text-nova-300">0{i + 1}</span>
                  <p className="mt-1 text-[13px] font-medium text-fog-200">{s}</p>
                </div>
              ))}
            </div>
            <p>
              Requests and proofs are plain JSON; trust comes from the circuit binding, not from NØVA
              servers. The full surface: <code className="font-mono text-[13px] text-fog-300">connectWallet() · issueCredential() · getPrivateCredentials() · generateProof() · verifyProof()</code>
            </p>
          </Section>

          <Section id="credentials" kicker="Data model" title="Credentials are sealed objects">
            <p>
              A credential binds a holder-side secret to an issuer through a one-way commitment —
              the same domain separation the Compact circuit uses (<code className="font-mono text-[13px] text-fog-300">nova:credential:</code>).
              Attributes live encrypted in the holder&apos;s vault and are only ever read by the
              local circuit.
            </p>
            <Code
              title="credential.ts"
              lang="ts"
              code={`interface PrivateCredential {
  id: string;                 // cred_9f2c11…
  kind: 'student' | 'age' | 'region' | 'developer' | …;
  label: string;              // display name — not a claim
  issuer: string;             // organization that vouched
  commitment: string;         // sha/persistentHash(nova:credential:, issuerPub, secret)
  issuedAt: string;
  status: 'verified' | 'pending' | 'revoked';
  attributes: {               // AES-GCM sealed; NEVER leaves the device
    age?: number; regionCode?: string; isStudent?: boolean;
    reputation?: number; verifiedProjects?: number; hackathons?: number;
  };
}`}
            />
          </Section>

          <Section id="policy" kicker="Policy engine" title="Natural language → requirement ids">
            <div className="flex items-start gap-3 rounded-lg border border-warn/20 bg-warn/5 p-4 text-[13px] text-fog-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <p>
                The policy engine is untrusted by construction: Qwen (or the deterministic local
                fallback) only <em>classifies intent</em> into a closed vocabulary of requirement
                ids. Every id is validated against the catalog; cryptographic truth is decided by
                the circuit, never by a model.
              </p>
            </div>
            <Code
              title="POST /api/policy"
              lang="http"
              code={`curl -X POST https://api.nova.xyz/policy \\
  -H 'content-type: application/json' \\
  -d '{"text": "students, at least 18, haven't received this grant before"}'

# 200
{
  "requirements": ["student", "age_18", "unique_applicant"],
  "notes": "Compiled by qwen-plus. Each id validated against the closed catalog.",
  "source": "qwen"
}`}
            />
          </Section>

          <Section id="verification" kicker="Lifecycle" title="Verification flow">
            <Code
              title="application.ts"
              lang="ts"
              code={`// 1 — organization publishes a requirement set (no PII collected)
const request = await createRequest({
  name: 'HackSpire Grant',
  organization: 'HackSpire Foundation',
  requirements: ['student', 'age_18', 'region_eligible', 'unique_applicant'],
});
// → shareable: https://nova.app/grant?request=req_…

// 2 — holder's device runs the circuit locally
const proof = await generateProof(request, await getPrivateCredentials());
// claims are computed against the vault; only commitments + attestation travel

// 3 — verifier receives claims + fingerprint, then checks binding
const result = await verifyProof(proof.id, request);
// → { verified: true, claims: [ …booleans… ], source: 'midnight-ledger' }`}
            />
            <p>
              Uniqueness is scope-bound: the campaign string names the reward, and the second
              attestation for the same (holder, scope) fails the circuit — the mechanism behind{' '}
              <span className="text-fog-200">One Person. One Proof.</span>
            </p>
          </Section>

          <Section id="midnight" kicker="Chain" title="Midnight integration">
            <p>
              NØVA ships a real Compact contract, compiled with the official toolchain
              (<code className="font-mono text-[13px] text-fog-300">compact compile contract/src/nova.compact</code>)
              at language 0.23, runtime <code className="font-mono text-[13px] text-fog-300">@midnight-ntwrk/compact-runtime@0.16</code>.
              The ledger only ever sees aggregates and one-way commitments:
            </p>
            <Code
              title="nova.compact (excerpt)"
              lang="compact"
              code={`export circuit registerCredential(issuer: Bytes<32>): [] {
  credentialAccumulator = disclose(
    accumulatorNext(credentialAccumulator,
      credentialCommitmentFor(credentialSecret(), issuer)));
  credentialCount.increment(1);
}

export circuit attest(scope: Bytes<32>): Bytes<32> {
  lastAttestation = disclose(
    attestationFor(credentialSecret(), scope, holderEntropy()));
  proofCount.increment(1);
  return lastAttestation;
}`}
            />
            <p>
              Circuits: <span className="font-mono text-[13px] text-fog-300">{NOVA_CIRCUITS.join(' · ')}</span>.
              Publish with <code className="font-mono text-[13px] text-fog-300">npm run deploy:ledger</code>{' '}
              against preprod/preview, then set <code className="font-mono text-[13px] text-fog-300">NEXT_PUBLIC_MIDNIGHT_MODE=ledger</code>.
              Without a deployed contract, NØVA runs the identical circuit semantics in the local
              proof engine and the UI labels attestations accordingly — never fabricating
              transactions.
            </p>
          </Section>

          <Section id="events" kicker="Async" title="Webhooks & events">
            <p>
              Verification is push-friendly. Every state change emits a claims-only event; the
              schema cannot carry attributes by construction:
            </p>
            <Code
              title="nova.proof.verified"
              lang="json"
              code={`{
  "type": "nova.proof.verified",
  "proofId": "proof_77b21e",
  "requestId": "req_hackspire_grant",
  "claims": {
    "student": true, "age_18": true,
    "region_eligible": true, "unique_applicant": true
  },
  "attestation": "0x9f3c…",
  "mode": "ledger",
  "revealedAttributes": 0
}`}
            />
            <ul className="ml-5 list-disc space-y-1 text-[14px] text-fog-500">
              <li><code className="font-mono text-[12.5px] text-fog-300">nova.credential.issued</code> — commitment folded into the accumulator</li>
              <li><code className="font-mono text-[12.5px] text-fog-300">nova.proof.generated</code> — holder-side, local</li>
              <li><code className="font-mono text-[12.5px] text-fog-300">nova.proof.verified</code> — scope check passed</li>
              <li><code className="font-mono text-[12.5px] text-fog-300">nova.uniqueness.rejected</code> — duplicate attestation for scope</li>
            </ul>
          </Section>

          <footer className="border-t border-line py-10 text-[13px] text-fog-600">
            Questions? Read the source — the whole stack, circuits included, ships with the app.
          </footer>
        </div>
      </div>
    </div>
  );
}
