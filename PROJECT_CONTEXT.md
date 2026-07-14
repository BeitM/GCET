# RoboLab FTC — Project Context

Snapshot: 2026-07-13. Active branch: `demo` at `ded33a4` before the uncommitted repair set described here.

## Product

RoboLab FTC is a browser-based learning prototype for FTC programmers. A user supplies a goal and RoboLab command code, configures a DECODE field and robot, runs an Autonomous or keyboard TeleOp simulation, reviews 3D playback/scoring/telemetry, and receives deterministic coaching with optional OpenAI output. The prototype does not compile FTC SDK Java and is not a full rules-accurate simulator.

## Architecture and entry points

- Next.js 16.2.9 App Router, React 19.2.4, strict TypeScript 5, Tailwind CSS 4.
- Three.js, React Three Fiber/Drei, and React Three Rapier provide the 3D field and physics.
- Simulation, parsing, recording, and scoring currently run in the browser; `POST /api/analyze` runs on the Next.js Node runtime.
- Offline CAD scripts use FreeCAD and Blender; they are not web-runtime dependencies.
- No database, real authentication, persistence, automated test suite, or CI exists.

Important paths:

```text
README.md                              Product vision and setup
AGENTS.md                              Future Codex working guide
my-app/frontend/
  package.json                         pnpm scripts and dependencies
  src/app/page.tsx                     Landing page (`/`)
  src/app/learn/page.tsx               Structured Learning Mode level hub
  src/app/simulator/page.tsx           Simulator orchestration and engine
  src/app/api/analyze/route.ts         Validation, coaching, optional OpenAI call
  src/components/InputPanel.tsx        Goal/code/robot/field setup
  src/components/FieldSimulator.tsx    3D wrapper and playback controls
  src/components/FieldScene3D.tsx      Three/Rapier field and physics recording
  src/components/TelemetryPanel.tsx    Telemetry and event log
  src/components/AIFeedbackPanel.tsx   Analysis and follow-up UI
  src/lib/types.ts                     Shared contracts
  src/lib/analysis.ts                  Analysis-frame compaction
  src/lib/robots.ts                    Robot presets (currently one)
  src/lib/seasons.ts                   DECODE active; BIOBUZZ placeholder
  public/models/fields/                DECODE GLB and reports
  scripts/cad/                         Offline model conversion/QA
```

## Current user flow

1. The landing page offers two first-class paths: an unrestricted Sandbox and a structured Learning Mode.
2. Sandbox opens the full simulator configuration. Learning Mode starts at `/learn`, then opens the shared simulator with level guidance and progressively exposed setup controls.
3. The user chooses Autonomous or TeleOp, enters a goal, edits code, and configures the controls available in the selected mode.
4. Autonomous parses a limited command DSL: drive/strafe, `driveToPosition`, turn, flywheel, shoot, intake, and wait. Unsupported syntax is ignored; this is not Java execution.
5. TeleOp uses W/A/S/D, arrow keys, Z for intake, and Space to shoot.
6. A browser timeline drives the Three/Rapier scene. Recorded classifier crossings produce 3-point classified shots up to a capacity of 9, then 1-point overflow shots.
7. Users can orbit/zoom, scrub completed playback, inspect telemetry, and analyze the run. Autonomous analyzes automatically; TeleOp analyzes after stop.
8. Analysis receives bounded code, robot setup, compact telemetry, and recent chat. It always creates deterministic feedback and optionally calls OpenAI when a non-mock server key is configured.
9. `/login`, `/student`, and `/coach` remain disconnected mock/static surfaces.

## What works

- Autonomous DSL execution, constrained poses, flywheel/intake/shooting behavior, keyboard TeleOp, playback, and rule warnings.
- Interactive DECODE field, procedural robot, artifact/projectile physics, compass, trails, classifier scoring, and overflow scoring.
- Goal/setup controls, configurable telemetry, scoring UI, debug-report copy, local coaching, and follow-up chat.
- Optional OpenAI analysis with code/setup context, request size/frame/message limits, provider timeout, safe fallback, and explicit mock mode.
- The DECODE GLB header, report JSON, and CAD Python syntax validate.

## Repairs completed in the current worktree

- Reinstalled pnpm dependencies after the repository moved from `C:\Code\GCET` to `C:\Code\robolab`; generated executable shims now reference the current path.
- Made pnpm canonical, pinned pnpm 11.10.0 and Node 20+, added `typecheck`, removed the npm lockfile, and cleaned tracked Python bytecode.
- Replaced tracked `.env.local` with ignored local env files plus `.env.example`.
- Ported and extended analysis safety: bounded/sanitized input, compact frames, code/setup context, timeout/fallback handling, and corrected RoboLab naming.
- Fixed lint findings in recorder reset behavior, mount state, unused code, and ref cleanup.
- Implemented the declared 9-shot classified capacity/overflow behavior.
- Corrected generic-goal feedback so missed shots are actionable instead of being labeled successful.
- Removed a deprecated Three.js soft-shadow setting and refreshed setup/status documentation.

## Configuration and commands

Runtime variables are server-only `OPENAI_API_KEY` and optional `OPENAI_MODEL`. Copy `.env.example` to `.env.local`; use `OPENAI_API_KEY=mock` for deterministic local feedback. Never commit a real key.

Run from `my-app/frontend`:

```powershell
corepack pnpm install
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm start
```

There is no `test` script yet.

## Verification (2026-07-13)

- `pnpm install --force --frozen-lockfile`: pass.
- ESLint: pass.
- TypeScript (`tsc --noEmit`): pass.
- Next.js production build: pass; all app routes generated.
- API smoke checks: valid mock request 200, invalid request 400, oversized request 413.
- Manual production-browser checks: Autonomous default run scored 3 points and produced baseline feedback; TeleOp missed shot produced a classifier-miss diagnosis; no application errors observed.
- Python CAD AST parse: 6/6 pass. Field report JSON: 2/2 pass. GLB header: pass.

## Known limitations and debt

1. No FTC SDK Java execution, complete rules model, multiple active robots/seasons, UI CAD import, accounts, persistence, or connected team dashboards.
2. No automated tests or CI; parser, coordinate, scoring, goal-evaluation, API, Autonomous, and TeleOp behavior need characterization tests.
3. TeleOp recording is unbounded, and browser state/UI updates remain expensive for long runs.
4. Scoring is classifier-authoritative in the UI, but older heuristic scoring totals still exist in telemetry and should be consolidated into one tested module.
5. Custom timeline physics is repaired by a second Rapier recording pass, making behavior complex and difficult to reproduce.
6. The high-poly visual field GLB is also used as a trimesh collider; replace it incrementally with simple purpose-built colliders.
7. `simulator/page.tsx`, `FieldScene3D.tsx`, and `api/analyze/route.ts` are large and should be split along parser/simulation/scoring/rendering/analysis boundaries.
8. `/api/analyze` still needs deployment-level authentication, rate limiting, and provider observability.
9. `demo` and `main` remain historically divergent; the relevant `main` safety concepts were ported manually, but do not blindly merge the branches.

## Recommended next steps

1. Add characterization tests and a CI gate for lint, type checking, build, and tests.
2. Extract a single scoring/rules module and remove heuristic/classifier total disagreement.
3. Bound/decimate TeleOp telemetry and reduce repeated high-frequency React state work.
4. Split parser, simulation engine, scoring, and analysis logic out of the large page/route files.
5. Replace the visual-mesh collider with simple colliders while preserving tested shot behavior.
6. Add auth/rate limits/observability before exposing the analysis endpoint publicly.
7. Decide whether the next increment is deeper simulator fidelity or real account/team workflows; keep the other prototype surfaces clearly quarantined.
