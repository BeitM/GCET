# RoboLab FTC Web App

This directory contains the Next.js frontend for RoboLab FTC, an FTC virtual simulation and debugging-feedback prototype.

See the [project README](../../README.md) for the product overview, current features, architecture, limitations, and roadmap.

## Quick Start

```bash
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000/ftc](http://localhost:3000/ftc) or go directly to [http://localhost:3000/ftc/simulator](http://localhost:3000/ftc/simulator).

## Deployment path

Vercel deploys this app from the repository's `main` branch with `my-app/frontend` as the project Root Directory. The fixed Next.js base path is `/ftc`; RoboLab Hub proxies `https://robo-labs.net/ftc/*` to this deployment.

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

Autonomous Sandbox provides a switcher for three code-complexity levels: simple robot commands, FTC-style motor power and timing calls, and a supported `LinearOpMode`-shaped Java subset. Structured Learning uses those interfaces for a six-lesson FTC skill sequence: movement, fixed-pose shooting, intake while driving, collection and retreat, preload autonomous, and a full collect-and-score cycle. Each lesson locks the appropriate code complexity, starts from an intentionally incomplete scaffold, configures its field artifacts, and provides sequential navigation.

After a run, Learning offers a deterministic browser-local **Check solution** action and a separate optional **Get AI feedback** action. Sandbox offers only **Get AI feedback**. Analysis is never requested automatically, and only the local solution check marks a lesson complete. The Java-shaped level is instructional and does not compile arbitrary Java or the full FTC SDK.

For simple Level 1 steering, `turn(degrees)` rotates relative to the robot's current heading and `turnTo(heading)` targets an absolute field heading.

Parameterized editor completions insert empty calls such as `driveRight()` and place the caret inside the parentheses. Concrete values shown in the Commands reference are examples, not autocomplete defaults.

## Prototype Status

The simulator runs a small autonomous command DSL or keyboard TeleOp against an interactive Three/Rapier DECODE field, records telemetry and classifier scoring, and provides deterministic mentor feedback with optional OpenAI output. Robot translation is scaled to 75% of its original speed across Autonomous helpers, timed motor control, and TeleOp. Autonomous code can set all eight robot motor channels, advance open-loop mecanum motion with `wait(seconds)`, position the shooter hood independently with `setHoodAngle(degrees)`, and use the supported level-three `waitForStart()`/`sleep(milliseconds)` training syntax. It does not execute arbitrary JavaScript or compile FTC SDK Java, implement complete competition physics/rules, or provide real accounts and persistence.
