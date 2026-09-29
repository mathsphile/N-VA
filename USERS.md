# N-VA — User Validation Record

Collected through the project feedback form, tracked in the user review spreadsheet. This file is
the auditable export of that tracker: the response count, the validation checks a reviewer would
run against it, and every row verbatim.

- **Form:** https://forms.gle/s5ErHwUmUsfARjpo6
- **Tracker:** https://docs.google.com/spreadsheets/d/12_wo1pkArdF5-j2_LvKGpiHiZExpY--uO0Sw5xErdG8/edit?gid=37793418
- **Collection window:** 01/09/2026 → 29/09/2026
- **Rows exported:** 58
- **Names/emails:** the tracker holds both. Names are reduced to first name + last initial here and
  emails are omitted entirely — 58 people did not consent to their contact details being published
  in a public repository, and a wallet address is what the criterion asks for, not an email.

## Validation checks (run against the export, not asserted)

| Check | Result | Pass |
|---|---|---|
| Response count | 58 | ✅ |
| Timestamps parse as `dd/mm/yyyy HH:MM:SS` | 58/58 | ✅ |
| Chronological order preserved | 58/58, 01/09 → 29/09 | ✅ |
| Ratings present and in 1–5 | 58/58 (avg **3.74**; 5★ ×10, 4★ ×23, 3★ ×25, 2★ ×0, 1★ ×0) | ✅ |
| Wallet column populated | 58/58 | ✅ |
| **Unique** wallet entries | **49** of 58 — 9 duplicate rows across 8 address groups | ❌ |
| Midnight **preprod** format (`mn_addr_preprod1…`) | **0** of 58 | ❌ |
| On-chain resolvable on the preprod indexer | **0** of 58 | ❌ |
| Cadence plausibility | exactly 2 responses per calendar day for 29 consecutive days | ⚠️ |

**Verdict on the Level 5 criterion — 50 unique Preprod user wallet addresses: NOT MET.**
Every supplied address is an `0x…` 40-hex EVM-style string; none is a Midnight bech32 address, so
none can be checked against `indexer.preprod.midnight.network`. Eleven of them
(e.g. `0x5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e`, `0x7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a`)
follow a sequential-nibble pattern typical of placeholder text rather than a wallet export, and
those are precisely the addresses that repeat. The content confirms it: the responses ask about gas
fee estimates, Polygon support, WalletConnect drops, ENS resolution, staking, NFTs, fiat on-ramps,
hardware wallets, multi-sig, cross-chain bridges, CSV export, iOS widgets and a light theme — none
of which exist in this codebase (`grep` over `src` and `contract/src` returns 0 files for each).

So these 58 rows are recorded as **feedback received through the form**, and are *not* counted as
evidence of N-VA usage on preprod. Padding a table with them under a "50 Preprod users" heading
would fail the exact cross-check the judging criteria describe.

## Duplicate address groups

| Address (as supplied) | Rows |
|---|---|
| `0x5B6c7D8e…` | 10, 30 |
| `0x2A3b4C5d…` | 13, 39 |
| `0x7F8a9B0c…` | 15, 26, 58 |
| `0xB0c1D2e3…` | 16, 43 |
| `0x1B2c3D4e…` | 20, 33 |
| `0xA7b8C9d0…` | 22, 36 |
| `0xD0e1F2a3…` | 23, 54 |
| `0xF2a3B4c5…` | 24, 55 |

## What would close this gap

The requirement is satisfiable **now that the registry is live**: the preprod contract
([`02f0cde4…`](https://preprod.midnightexplorer.com/address/02f0cde4d7df1789e5b578ebba225e0360e34ad163fed20ebf7764d2f687dada))
has already run publish → `initialize` → `registerCredential` → `attest` and reads back from the
indexer as `status: LIVE`, `credentialCount 1`, `proofCount 1`. What separates this table from a
passing check is no longer infrastructure — it is real holders running those flows.

Each row then becomes evidence rather than a claim, because all three fields are machine-checkable:

1. the holder's **`mn_addr_preprod1…`** address, from their own connected wallet (the app already
   reads it through the injected DApp Connector);
2. a **transaction hash** for a real `registerCredential` or `attest` call they submitted;
3. the **block/index height** the indexer reports for that hash.

A reviewer can paste any address or hash into the preprod indexer or explorer and see the same
result the table claims. That is the difference between this file and a list of strings — and it is
why the table below is the feedback corpus, not a user roster.

## Feedback responses (verbatim export, 58 rows)

| # | Timestamp | Participant | Rating | Wallet address (as supplied) | Feedback |
|---|---|---|---|---|---|

## Every response, verbatim

| # | Timestamp | Participant | Rating | Wallet address (as supplied) | Feedback |
|---|---|---|---|---|---|
| 1 | 01/09/2026 01:12:45 | Chandranshu D. | 3 | `0x71CB05EE1b18360D2702D8B0d4023403a45c3b90` | UI is kinda clunky. Need a dark mode asap. |
| 2 | 01/09/2026 01:45:22 | Ankan D. | 3 | `0x3a4fB92C5a2A97828c4609825b7aC4F621b19A12` | takes too long to load on my phone. please optimize. |
| 3 | 02/09/2026 01:05:10 | Indrajit A. | 4 | `0x9812A6b4dF23Cc571a0846E28C84715A3E9b0c51` | Really smooth experience, but would love push notifications for deposits. |
| 4 | 02/09/2026 01:33:14 | Srija M. | 5 | `0x4B2C81f358a9D6F034B8E1922c2a08C57D29F4aA` | Flawless execution! A portfolio chart over time would make it perfect. |
| 5 | 03/09/2026 01:18:50 | Ishan D. | 4 | `0x8a92F1c4B3e5D6a78C90E1F2A3B4c5d6e7f8a9B0` | Great so far. Maybe add biometric login? |
| 6 | 03/09/2026 01:52:05 | Avishek M. | 3 | `0x12c4b5e6D7F8A9b0C1d2e3F4a5b6C7d8E9f0a1b2` | needs better sorting options for transaction history. |
| 7 | 04/09/2026 01:22:31 | Shuvam D. | 5 | `0xC3d4e5f6A7B8c9D0e1F2a3B4c5D6e7F8a9b0c1d2` | Super fast txs. Would be cool to see NFT support in the future. |
| 8 | 04/09/2026 01:48:19 | Uzzal S. | 3 | `0xE1f2A3b4C5d6E7f8A9b0c1D2e3F4a5B6c7D8e9F0` | sometimes the app crashes when I switch tabs. fix this. |
| 9 | 05/09/2026 01:04:44 | Tiyasa M. | 3 | `0xA9b0C1d2E3f4A5b6C7d8E9f0A1b2c3D4e5F6a7B8` | kinda confusing for beginners. a tutorial overlay would help. |
| 10 | 05/09/2026 01:29:12 | Sudipta M. | 5 | `0x5B6c7D8e9F0a1B2c3D4e5F6a7B8c9D0e1F2a3B4c` | best wallet I've used. maybe add staking directly from dashboard? |
| 11 | 06/09/2026 01:15:35 | Shreya D. | 4 | `0xD4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9b0c1d2E3` | Solid app. Just wish the dashboard was more customizable. |
| 12 | 06/09/2026 01:57:02 | Bristi S. | 3 | `0xF6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1d2E3f4A5` | can u add a way to export tx history as csv? it's annoying manually tracking. |
| 13 | 07/09/2026 01:08:21 | Debjit K. | 3 | `0x2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b` | gas fees estimate is sometimes off compared to the actual charge. |
| 14 | 07/09/2026 01:42:55 | Jishu D. | 4 | `0xC5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b2c3D4` | nice UI but needs more custom token support. |
| 15 | 08/09/2026 01:11:13 | Saikat P. | 3 | `0x7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a` | logging in takes too many clicks. streamline it. |
| 16 | 08/09/2026 01:39:40 | Rishav B. | 4 | `0xB0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9` | good stuff. add support for multiple accounts under one seed phrase? |
| 17 | 09/09/2026 01:25:27 | Rajdip G. | 3 | `0xE3f4A5b6C7d8E9f0A1b2C3d4E5f6A7b8C9d0E1f2` | it’s decent but lacks fiat onramp options. |
| 18 | 09/09/2026 01:51:18 | Shuvam D. | 4 | `0x4A5b6C7d8E9f0A1b2C3d4E5f6A7b8C9d0E1f2A3b` | works perfectly but the font size is a bit too small on mobile. |
| 19 | 10/09/2026 01:06:54 | Sounak B. | 3 | `0x8E9f0A1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f` | refresh button doesn't always update the balance immediately. |
| 20 | 10/09/2026 01:36:09 | Most S. | 4 | `0x1B2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c` | really like the design. please add a price alert feature. |
| 21 | 11/09/2026 01:14:48 | Diganta N. | 3 | `0xD4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1d2E3` | auto-lock timer is too aggressive, let me change it in settings. |
| 22 | 11/09/2026 01:47:33 | Sankhadip M. | 4 | `0xA7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6` | smooth bridging experience. would love to see L2 support soon. |
| 23 | 12/09/2026 01:03:12 | ROHAN S. | 3 | `0xD0e1F2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9` | support team took 2 days to reply. needs to be faster. |
| 24 | 12/09/2026 01:29:57 | Sanchita S. | 3 | `0xF2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1` | needs an address book feature so I dont have to paste every time. |
| 25 | 13/09/2026 01:17:41 | SHOBHA B. | 4 | `0xB4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3` | overall great, but face ID integration would be sweet. |
| 26 | 13/09/2026 01:55:20 | Shreya D. | 3 | `0x7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a` | app size is getting a bit too big for my older phone. |
| 27 | 14/09/2026 01:22:15 | Rikita R. | 4 | `0x9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c` | clean interface. waiting for the mobile widget on iOS. |
| 28 | 14/09/2026 01:49:03 | Tanish K. | 4 | `0x1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9D0e` | good security features. please add hardware wallet support (ledger). |
| 29 | 15/09/2026 01:09:47 | Mainak K. | 3 | `0x3F4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9D0e1F2a` | why no Polygon network support yet? |
| 30 | 15/09/2026 01:38:22 | DEBOSHREYA G. | 4 | `0x5B6c7D8e9F0a1B2c3D4e5F6a7B8c9D0e1F2a3B4c` | love it. a built-in swap aggregator would make it 5 stars easily. |
| 31 | 16/09/2026 01:12:09 | ABHISHEK D. | 4 | `0x7D8e9F0a1B2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e` | very responsive. just missing p2p trading options. |
| 32 | 16/09/2026 01:45:51 | Sourav S. | 3 | `0x9F0a1B2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a` | connecting to some dapps via walletconnect is sometimes buggy. |
| 33 | 17/09/2026 01:05:36 | Puskar A. | 3 | `0x1B2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c` | needs better translation for local languages, some text is weird. |
| 34 | 17/09/2026 01:33:28 | ROHAN S. | 4 | `0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2` | nice work! add a hide zero balances toggle so my list isn't cluttered. |
| 35 | 18/09/2026 01:18:14 | Ananya B. | 4 | `0xE5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4` | pretty intuitive. would be nice to group assets by network visually. |
| 36 | 18/09/2026 01:52:01 | Soumya C. | 5 | `0xA7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6` | Absolutely brilliant app. A PnL tracking feature would be the cherry on top. |
| 37 | 19/09/2026 01:10:44 | Rahul M. | 3 | `0xC9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8` | gas fee customization is a bit hidden, make it more prominent. |
| 38 | 19/09/2026 01:41:25 | Sneha R. | 4 | `0xE1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0` | easy to use. add ENS resolution please! |
| 39 | 20/09/2026 01:04:12 | Arindam G. | 5 | `0x2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b` | Highly secure and fast. Just maybe add a light theme for daytime use. |
| 40 | 20/09/2026 01:30:58 | Puja S. | 3 | `0x4C5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b2C3d` | transaction history doesn't show the exact time, only the date. |
| 41 | 21/09/2026 01:16:33 | Abhishek N. | 4 | `0x6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b2C3d4E5f` | great wallet, but I want to track my staking rewards natively. |
| 42 | 21/09/2026 01:56:47 | Riya S. | 3 | `0x8A9b0C1d2E3f4A5b6C7d8E9f0A1b2C3d4E5f6A7b` | it's okay, but feels a bit bloated with the new update. |
| 43 | 22/09/2026 01:08:15 | Kaushik B. | 5 | `0xB0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9` | 10/10 experience. A native cross-chain bridge would make it literally perfect. |
| 44 | 22/09/2026 01:44:02 | Priyanka D. | 4 | `0xD2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9D0e1` | stable and fast. missing fingerprint authentication on android though. |
| 45 | 23/09/2026 01:21:29 | Amitava P. | 3 | `0xF4a5B6c7D8e9F0a1B2c3D4e5F6a7B8c9D0e1F2a3` | token icons take too long to load sometimes, looks glitchy. |
| 46 | 23/09/2026 01:49:55 | Srijit M. | 5 | `0xA5b6C7d8E9f0A1b2C3d4E5f6A7b8C9d0E1f2A3b4` | Amazing app. No complaints, but auto-approve for certain trusted dapps would be cool. |
| 47 | 24/09/2026 01:14:10 | Moumita S. | 4 | `0xC7d8E9f0A1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6` | reliable app. wish there was a way to easily revoke permissions in-app. |
| 48 | 24/09/2026 01:37:34 | Bipasha G. | 3 | `0xE9f0A1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8` | I don't like the new layout, give us an option to revert to classic view. |
| 49 | 25/09/2026 01:06:48 | Kazi R. | 5 | `0x0A1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b` | flawless execution. adding a built-in web3 browser would be epic. |
| 50 | 25/09/2026 01:35:12 | Sumit P. | 4 | `0x2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d` | good so far. needs a one-tap option to speed up pending transactions. |
| 51 | 26/09/2026 01:19:59 | Nandini B. | 3 | `0x4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f` | scanning QR codes is a hit or miss, camera doesn't focus right away. |
| 52 | 26/09/2026 01:54:21 | Tathagata S. | 5 | `0x6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b` | Awesome. A multi-sig feature integration would be great for teams. |
| 53 | 27/09/2026 01:12:33 | Pallavi D. | 4 | `0x8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d` | really good, but custom RPCs are a bit hard to set up for beginners. |
| 54 | 27/09/2026 01:46:15 | Ritwik H. | 3 | `0xD0e1F2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9` | I keep getting disconnected from WalletConnect randomly. |
| 55 | 28/09/2026 01:02:44 | Subhamita K. | 4 | `0xF2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1` | nice aesthetic. please add a portfolio distribution pie chart! |
| 56 | 28/09/2026 01:28:10 | Deep N. | 5 | `0x3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c` | Superb! Way better than competitors. Native fiat withdrawals when? |
| 57 | 29/09/2026 01:15:22 | Anita C. | 3 | `0x5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e` | network switching is not very intuitive, takes too much scrolling. |
| 58 | 29/09/2026 01:58:37 | Vikram S. | 4 | `0x7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3D4e5F6a` | very solid app. just add more language support for regional users. |
