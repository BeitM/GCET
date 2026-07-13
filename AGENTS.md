# RoboLab FTC Agent Guide

For the detailed repository snapshot, branch history, verification results, and technical-debt inventory, read [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) before substantial work.

## Product

RoboLab is an AI-assisted FTC robotics coding and simulation platform for students, programmers, and teams. The target experience is: write or upload robot code, run it in a full simulated FTC field, observe behavior and telemetry, and receive useful AI debugging and optimization feedback. It should grow beyond autonomous routines, but changes should advance the vision incrementally and preserve a clean, approachable learning experience.

## Current architecture

- Next.js 16 App Router application with React 19, strict TypeScript, Tailwind CSS 4, and global CSS.
- Three.js via React Three Fiber/Drei and Rapier for the interactive DECODE field, robot, artifacts, shots, and playback.
- Browser-side simulation state, command parsing, TeleOp controls, telemetry recording, and scoring.
- Node-runtime `POST /api/analyze` route with deterministic feedback and an optional direct OpenAI call.
- Offline Python utilities use FreeCAD and Blender to inspect STEP assemblies and produce/verify field GLBs.
- No database, real authentication, persistence, automated test suite, or CI is currently present.

## Important paths

- `my-app/frontend/src/app/simulator/page.tsx` — main simulator orchestration and simulation engine.
- `my-app/frontend/src/components/FieldScene3D.tsx` — Three/Rapier field and physics recording.
- `my-app/frontend/src/app/api/analyze/route.ts` — telemetry summary and AI feedback endpoint.
- `my-app/frontend/src/components/` — setup, field, robot, telemetry, and AI panels.
- `my-app/frontend/src/lib/` — shared types, robot presets, and seasons.
- `my-app/frontend/public/models/fields/` — DECODE GLB and conversion reports.
- `my-app/frontend/scripts/cad/` — FreeCAD/Blender asset-pipeline scripts.
- `README.md` — product vision; verify statements against current code because parts are stale.

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

The repository currently has no `test` script or test-runner configuration. Add focused tests when introducing testable behavior; otherwise document the manual verification performed. pnpm 11 is the canonical package manager; preserve `pnpm-lock.yaml` and do not introduce another lockfile.

## Conventions

- Follow the style of the file being edited; use functional React components and hooks.
- Use `"use client"` only for components that need browser APIs, state, effects, or event handling.
- Keep shared domain types in `src/lib/types.ts` and use the `@/*` import alias.
- Keep server-only secrets and provider calls in route handlers. Never commit a live API key or expose it through `NEXT_PUBLIC_*`.
- Preserve explicit unit boundaries: simulator/field coordinates are primarily inches; Three/Rapier values are meters.
- Keep simulation, scoring, telemetry, rendering, and AI analysis conceptually separable even where current files are monolithic.
- Avoid broad formatting or cleanup mixed into functional changes.

## Working rules

1. Inspect the relevant implementation, types, callers, configuration, Git status, and nearby history before editing. Do not rely on the README alone.
2. Make the smallest coherent change that advances the requested behavior; do not attempt the whole product vision at once.
3. Preserve both Autonomous and TeleOp flows, field coordinate modes, alliance behavior, playback, scoring, telemetry, deterministic AI fallback, and 3D interaction unless the task explicitly changes them.
4. Treat scoring and recorded physics as user-visible behavior. Verify changes across command generation, Rapier recording, playback, and analysis rather than testing only one layer.
5. Preserve user changes and unrelated work in a dirty worktree. Do not rewrite lockfiles, generated field assets, or CAD reports without a task-specific reason.
6. Run lint, type checking, and a production build before declaring code changes complete. Run applicable automated tests and manually exercise the affected user flow. If a check cannot run, report the blocker and never describe it as passing.
7. For simulator changes, at minimum verify one Autonomous run and the affected scoring/telemetry/analysis path; verify TeleOp controls when shared state, physics, input, or playback changes.
8. Update documentation when behavior, commands, environment variables, or limitations change.

## Current priorities and limitations

- Establish automated tests around parsing, coordinates, bounds, scoring, goal evaluation, API validation, Autonomous, and TeleOp flows.
- Finish deployment hardening for `/api/analyze`, especially authentication/rate limits and provider observability.
- Establish one authoritative, tested scoring/rules model and align all telemetry totals with classifier events.
- Bound TeleOp telemetry and reduce duplicated custom/Rapier physics state repair before expanding simulation scope.
- Replace expensive visual-mesh collision with simple colliders where practical, then split monolithic simulator/scene files incrementally.
- FTC SDK code execution, full rules accuracy, multiple robots/seasons, UI CAD import, real accounts, persistence, and team dashboards remain future work.
