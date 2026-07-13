# RoboLab FTC Web App

This directory contains the Next.js frontend for RoboLab FTC, an FTC virtual simulation and debugging-feedback prototype.

See the [project README](../../README.md) for the product overview, current features, architecture, limitations, and roadmap.

## Quick Start

```bash
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) or go directly to [http://localhost:3000/simulator](http://localhost:3000/simulator).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create and type-check a production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript without emitting files |

## AI configuration

Copy `.env.example` to `.env.local`. Leave `OPENAI_API_KEY=mock` for deterministic local feedback, or provide a server-side key and optional `OPENAI_MODEL` to enable generated analysis. Never commit `.env.local`.

## Prototype Status

The simulator runs a small autonomous command DSL or keyboard TeleOp against an interactive Three/Rapier DECODE field, records telemetry and classifier scoring, and provides deterministic mentor feedback with optional OpenAI output. It does not compile FTC SDK Java, implement complete competition physics/rules, or provide real accounts and persistence.
