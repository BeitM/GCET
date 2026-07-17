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

Copy `.env.example` to `.env.local`. Leave `OPENAI_API_KEY=mock` for deterministic local feedback, or provide a server-side key and optional `OPENAI_MODEL` to require generated analysis. Invalid or missing keys use the deterministic fallback; other provider failures are shown as errors. Never commit `.env.local`.

## Learning levels

Autonomous Sandbox provides a switcher for three code-complexity levels: simple robot commands, FTC-style motor power and timing calls, and a supported `LinearOpMode`-shaped Java subset. Structured Learning provides two scenarios at every level, locks the editor complexity to the chosen level, starts from an intentionally incomplete scaffold, and offers sequential navigation across all six lessons. It sends the scenario focus and success criteria to AI analysis so advice stays appropriate for the current objective and syntax. The Java-shaped level is instructional and does not compile arbitrary Java or the full FTC SDK.

## Prototype Status

The simulator runs a small autonomous command DSL or keyboard TeleOp against an interactive Three/Rapier DECODE field, records telemetry and classifier scoring, and provides deterministic mentor feedback with optional OpenAI output. Robot translation is scaled to 75% of its original speed across Autonomous helpers, timed motor control, and TeleOp. Autonomous code can set all eight robot motor channels, advance open-loop mecanum motion with `wait(seconds)`, and use the supported level-three `waitForStart()`/`sleep(milliseconds)` training syntax. It does not execute arbitrary JavaScript or compile FTC SDK Java, implement complete competition physics/rules, or provide real accounts and persistence.
