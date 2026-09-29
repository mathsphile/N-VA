# Self-hosted fonts

| File | Family | Coverage | Source | License |
|---|---|---|---|---|
| `Inter-latin.woff2` | Inter (variable, weight 100–900) | `latin` subset | [Google Fonts](https://fonts.google.com/specimen/Inter), Rasmus Andersson | SIL Open Font License 1.1 |
| `JetBrainsMono-latin.woff2` | JetBrains Mono (variable, weight 400–700) | `latin` subset | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono), JetBrains | SIL Open Font License 1.1 |

Both are variable-font `woff2` files, fetched once from `fonts.gstatic.com` and committed so the
build is offline-deterministic. Consumed through `next/font/local` in `src/app/layout.tsx`, which
keeps the `--font-inter` and `--font-mono-jb` CSS variables used across the app.

**Why they live here:** with `next/font/google`, `next build` fetched the font metadata over the
network at build time. On 2026-09-30 that fetch came back unusable on GitHub's runner and the loader
threw `TypeError: Cannot read properties of null (reading '1')` in
`@next/font/dist/google/loader.js`, failing the pipeline for a README-only change. Self-hosting
removes the third-party dependency — and drops the visitor's request to Google, which suits a
privacy product.

Redistribute under OFL: keep this file alongside them.
