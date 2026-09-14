<p align="center">
  <img src="/public/afterprint-logo.png" width="72" alt="Afterprint logo" />
</p>

<h1 align="center">Afterprint</h1>

<p align="center">
  Evidence intelligence for serious investigations — AI-assisted extraction with every claim traceable to a source, an append-only chain of custody, and integrity anchored on Stellar.
</p>

<p align="center">
  <a href="https://afterprint.vercel.app"><strong>Live app</strong></a> ·
  <a href="https://github.com/Afterprint/afterprint-api">API</a> ·
  <a href="https://github.com/Afterprint/afterprint-ai">AI service</a> ·
  <a href="https://github.com/Afterprint/afterprint-contracts">Contracts</a>
</p>

<p align="center">
  <a href="https://github.com/Afterprint/afterprint-web/actions/workflows/ci.yml"><img src="https://github.com/Afterprint/afterprint-web/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/framework-Next.js%2016-000000" alt="Next.js 16">
  <img src="https://img.shields.io/badge/network-Stellar%20Testnet-blue" alt="Stellar Testnet">
  <img src="https://img.shields.io/github/license/Afterprint/afterprint-web" alt="License">
</p>

---

## The problem

Investigators and legal teams working a case end up with recordings, documents, sensor logs, and reports scattered across tools with no shared timeline and no way to prove nothing was altered after the fact. Afterprint ingests that evidence, has AI extract and cross-reference it — never asserting anything it can't cite a source for — and anchors integrity proofs on Stellar so the chain of custody can be verified independent of Afterprint's own database.

## How it works

1. Sign in with a Stellar (Freighter) wallet — no password, no email.
2. Upload evidence into a case. Every file becomes an immutable, versioned object with a custody event on import.
3. `afterprint-ai` extracts claims from each source, categorized `VERIFIED_FACT` / `CORROBORATED_CLAIM` / `INFERENCE` / `CONFLICT` / `UNKNOWN` — every grounded claim cites the exact source span it came from.
4. Custody events and attestations get anchored on Stellar Testnet via the [registry contracts](https://github.com/Afterprint/afterprint-contracts).
5. Ask a question about the case and get an answer with citations, not a guess.

## Architecture

```
                    ┌──────────────────┐
   user ──────────▶ │  afterprint-web  │  (this repo — Next.js, Vercel)
                    └────────┬─────────┘
                             │ REST, cookie session
                             ▼
                    ┌──────────────────┐        ┌───────────────────┐
                    │  afterprint-api  │───────▶│   afterprint-ai    │
                    │  (NestJS/Fastify)│        │   (FastAPI)        │
                    └───┬────────┬─────┘        └─────────┬──────────┘
                        │        │                        │
                        ▼        ▼                        ▼
                  Postgres    Redis                  Groq Whisper
                 (Supabase) (Upstash)              (transcription)
                        │
                        ▼
              Stellar Testnet — afterprint-contracts
           (case / evidence / custody / attestation / access registries)
```

## Quick start

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL
pnpm dev
```

```bash
pnpm typecheck
pnpm build
pnpm exec playwright test tests/e2e/smoke.spec.ts   # needs a running instance
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow and coding standards, and [SECURITY.md](./SECURITY.md) to report a vulnerability privately. Related repos: [afterprint-api](https://github.com/Afterprint/afterprint-api), [afterprint-ai](https://github.com/Afterprint/afterprint-ai), [afterprint-contracts](https://github.com/Afterprint/afterprint-contracts).

## Maintainer

| | |
|---|---|
| **GitHub** | [@helloworld1-star](https://github.com/helloworld1-star) |
| **Email** | chijiokejoseph20242@gmaill.com |

---

<p align="center">
  <a href="https://github.com/Afterprint/afterprint-web/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Afterprint/afterprint-web" alt="Contributors" />
  </a>
</p>
