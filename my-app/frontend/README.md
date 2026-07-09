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

## AI Feedback Setup

Create a `.env.local` file in `my-app/frontend` with:

```bash
OPENAI_API_KEY=your_api_key_here
# Optional. Defaults to gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

The simulator `Get AI feedback` action sends the current goal, robot code, robot setup, and recent telemetry to `/api/analyze`, which calls the configured model and returns structured coaching feedback.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create and type-check a production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run ESLint |

## Prototype Status

The current simulator uses deterministic demo scenarios and local robot-code parsing. It does not yet compile FTC SDK code or run full FTC-accurate physics, but it can call a configured AI model for structured telemetry feedback.
