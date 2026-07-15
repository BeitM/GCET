# RoboLab FTC Agent Guide

Read [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) before substantial work for the current architecture, supported user flows, verification status, and known limitations.

## Product

RoboLab is an AI-assisted FTC robotics coding and simulation platform for students, programmers, and teams. The target experience is: write robot code, run it on a simulated FTC field, observe behavior and telemetry, and receive useful AI debugging and optimization feedback. Changes should advance that vision incrementally while preserving an approachable learning experience.

## Current architecture

- Next.js 16 App Router application with React 19, strict TypeScript, Tailwind CSS 4, and global CSS.
- Three.js through React Three Fiber/Drei and Rapier for the DECODE field, robot, artifacts, shots, and playback.
- Browser-side Autonomous and TeleOp simulation, command parsing, motor state, telemetry recording, and scoring.
- TeleOp supports keyboard input plus one physical browser gamepad or an on-screen virtual gamepad. Gamepad UI and bindings must remain isolated to TeleOp.
- Node-runtime `POST /api/analyze` route with deterministic feedback and an optional server-side OpenAI call.
- Offline FreeCAD and Blender utilities inspect STEP assemblies and produce or verify field assets.
- No database, real authentication, persistence, automated test suite, or CI is currently present.

## Important paths

- `my-app/frontend/src/app/page.tsx` — homepage and Sandbox/Learning entry points.
- `my-app/frontend/src/app/learn/page.tsx` — structured learning level hub.
- `my-app/frontend/src/app/simulator/page.tsx` — simulator orchestration and simulation engine.
- `my-app/frontend/src/app/api/analyze/route.ts` — telemetry validation, deterministic coaching, and optional AI provider call.
- `my-app/frontend/src/app/robot-preview/page.tsx` — internal robot/motor inspection bench; not a primary user-flow destination.
- `my-app/frontend/src/components/FieldScene3D.tsx` — Three/Rapier field and physics recording.
- `my-app/frontend/src/components/VirtualGamepad.tsx` — TeleOp-only virtual controller.
- `my-app/frontend/src/lib/motors.ts` and `src/lib/teleop.ts` — motor and gamepad domain helpers.
- `my-app/frontend/public/models/fields/` and `scripts/cad/` — DECODE assets and offline CAD pipeline.

## Commands

Run frontend commands from `my-app/frontend`:

```powershell
corepack pnpm install
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm start
```

The repository has no `test` script or test-runner configuration. Add focused tests when introducing testable behavior; otherwise document manual verification. pnpm 11 is canonical; preserve `pnpm-lock.yaml` and do not introduce another lockfile.

## Conventions

- Follow the style of the file being edited; use functional React components and hooks.
- Use `"use client"` only for components that need browser APIs, state, effects, or event handling.
- Keep shared domain types in `src/lib/types.ts` and use the `@/*` import alias.
- Keep secrets and provider calls in route handlers. Never commit a live key or expose it through `NEXT_PUBLIC_*`.
- Preserve explicit unit boundaries: simulator/field coordinates are primarily inches; Three/Rapier values are meters.
- Keep simulation, scoring, telemetry, rendering, input, and AI analysis conceptually separable.
- Avoid broad formatting or cleanup mixed into functional changes.

## Working rules

1. Inspect implementation, types, callers, configuration, Git status, and nearby history before editing.
2. Make the smallest coherent change that advances the requested behavior.
3. Preserve Sandbox and Learning entry paths, Autonomous and TeleOp flows, field coordinate modes, alliance behavior, playback, scoring, telemetry, deterministic AI fallback, and 3D interaction unless explicitly changing them.
4. Treat scoring and recorded physics as user-visible behavior. Verify command generation, Rapier recording, playback, and analysis together.
5. Keep gamepad discovery, rendering, and control evaluation inside TeleOp. Autonomous and learning-mode defaults must not depend on a controller.
6. Preserve user changes and unrelated work in a dirty worktree. Do not rewrite lockfiles, generated field assets, or CAD reports without a task-specific reason.
7. Run lint, type checking, and a production build before declaring code changes complete. Report any blocker rather than describing an unrun check as passing.
8. For simulator changes, manually verify an Autonomous run and its scoring/telemetry/analysis path; verify keyboard and virtual gamepad TeleOp when input or shared simulation state changes.
9. Update documentation when behavior, commands, environment variables, or limitations change.

## Current priorities

- Add automated characterization tests and CI around parsing, coordinates, bounds, scoring, goal evaluation, API validation, Autonomous, and TeleOp.
- Consolidate scoring into one authoritative model and align all telemetry totals with classifier events.
- Bound TeleOp telemetry and reduce high-frequency React updates.
- Replace expensive visual-mesh collision with simpler colliders where practical.
- Split the large simulator and scene files along parser, simulation, scoring, rendering, input, and analysis boundaries.
- Add authentication, rate limits, and provider observability before exposing `/api/analyze` publicly.
