# JobSafe Tracker

A private job tracker for Philippine job seekers that warns you when a job post looks like a
scam, and shows you exactly why. Chrome extension (Manifest V3) + responsive web dashboard +
deterministic rules engine + AI explanations with tool calling.

- Product spec: [`DOCUMENTATION/PRD.md`](DOCUMENTATION/PRD.md)
- Build plan: [`DOCUMENTATION/IMPLEMENTATION_PLAN.md`](DOCUMENTATION/IMPLEMENTATION_PLAN.md)
- Phase status: [`DOCUMENTATION/phase-0-status.md`](DOCUMENTATION/phase-0-status.md)

## Repository layout

```
apps/
  web/            Next.js dashboard + API (Phase 1)
  extension/      Chrome MV3 extension, JobStreet PH + Indeed PH adapters (Phase 3)
packages/
  shared/         Shared types, constants, pure helpers (all phases)
tools/            Zero-dependency scripts (Groq model benchmark, etc.)
eval/             Labeled scam/legit post dataset + evaluation runner (Phase 0+)
DOCUMENTATION/    PRD, implementation plan, ToS review, threat model, legal drafts
.github/          CI: lint, format check, typecheck, tests, secrets scan
```

## Getting started

```sh
pnpm install
pnpm lint          # eslint
pnpm format:check  # prettier
pnpm typecheck     # typescript (packages/shared)
pnpm test          # vitest
```

Everything runs as a pnpm workspace. Real secrets live only in `.env` (never committed),
modeled by [`.env.example`](.env.example). CI blocks commits containing secrets via gitleaks.

## Ground rules baked into the code

- The product never says a job or company is "safe", "legit", or "a scam" - only
  "no red flags found" / "warning signs found", with quoted evidence for every flag.
- The limits statement in `packages/shared/src/constants.ts` ships with every result.
- User data is minimal, exportable, and deletable; provider keys are server-only.
