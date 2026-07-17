# RoboLab FTC — Project Context

Snapshot: 2026-07-17. Active branch: `demo`, including the three-level learning curriculum and scenario-aware AI guidance.

## Product and current scope

RoboLab FTC is a browser-based robotics learning prototype. A user supplies a goal and supported robot-command code, configures a DECODE field and robot, runs an Autonomous or TeleOp simulation, reviews 3D playback, scoring, and telemetry, and receives deterministic coaching without a valid OpenAI key or generated coaching when one is configured.

The prototype does not compile arbitrary JavaScript or FTC SDK Java and is not a complete rules-accurate simulator.

## Primary user flows

1. The homepage presents an unrestricted **Sandbox** and a **Structured Learning** path.
2. Sandbox opens the complete simulator and lets the user switch its Autonomous editor among three code-complexity levels. Learning opens `/learn`, where each level offers two guided scenarios before launching the shared simulator with that level's fixed code complexity plus matching partial starter scaffold, setup, read-only objective, focus, and success criteria. Previous/next controls follow all six lessons in order, including transitions between levels, and successful analysis exposes a bottom-of-report continuation action.
3. The three-level progression moves from readable action commands, to FTC-style motor `setPower()` calls with explicit timing, to a supported `LinearOpMode`-shaped Java subset using `waitForStart()` and `sleep(milliseconds)`. Guided starters intentionally leave required commands as TODOs instead of supplying a working solution. Autonomous parses only the documented subset; it does not compile arbitrary Java or the FTC SDK.
4. TeleOp uses the same simulation, physics-recording, scoring, telemetry, and analysis path as Autonomous. It accepts keyboard controls plus `gamepad1` bindings from either the first connected browser gamepad or the on-screen virtual controller.
5. Gamepad controls and UI appear only after TeleOp is selected. Keyboard input remains available as a fallback.
6. Analysis receives bounded code, setup information, compact telemetry, recent chat, and the active learning level/scenario criteria. Before submission, recorded internal field positions are converted to the selected corner- or center-origin display coordinates so AI comparisons match the user's code. Generated advice is instructed to stay within the selected syntax complexity and assess the chosen scenario. It provides deterministic feedback only when the server key is missing, explicitly set to `mock`, or rejected as invalid. With a valid configured key, OpenAI generates the complete visible feedback structure and follow-up answers; provider failures surface as errors rather than silently falling back. The feedback header identifies the active model or local fallback source.

## Architecture and entry points

- Next.js 16.2.9 App Router, React 19.2.4, strict TypeScript 5, and Tailwind CSS 4.
- Three.js, React Three Fiber/Drei, and React Three Rapier provide the 3D field and physics.
- Simulation, input evaluation, recording, and scoring run in the browser; `POST /api/analyze` runs on the Node runtime.
- Offline CAD scripts use FreeCAD and Blender and are not web-runtime dependencies.

Important paths:

```text
README.md                              Product vision and setup
AGENTS.md                              Shared repository working rules
LESSON_SOLUTIONS.txt                   Instructor/reference solutions for all six lessons
my-app/frontend/
  src/app/page.tsx                     Landing page and two-mode entry
  src/app/learn/page.tsx               Structured Learning level hub
  src/app/simulator/page.tsx           Simulator orchestration and engine
  src/app/api/analyze/route.ts         Validation, coaching, optional AI call
  src/app/robot-preview/page.tsx        Internal CAD/motor inspection bench
  src/components/FieldScene3D.tsx      Three/Rapier field and recording
  src/components/VirtualGamepad.tsx    TeleOp virtual controller
  src/lib/autonomous.ts                Autonomous command parser and command types
  src/lib/motors.ts                    Eight-channel motor helpers
  src/lib/learning.ts                  Complexity levels and six scenarios
  src/lib/teleop.ts                    Gamepad snapshots and binding parser
  src/lib/types.ts                     Shared contracts
```

## Motor model

The current script interface retains four mecanum drive channels, an intake channel, two mirrored flywheel channel names, and a turret channel for compatibility. Autonomous supports calls such as `frontLeftDrive.setPower(0.6)` and `wait(seconds)` for open-loop motor movement. Its level-three parser also recognizes `waitForStart()` and converts `sleep(milliseconds)` to simulator time while ignoring supported Java class boilerplate. Robot translation uses a shared 0.75 speed scale for high-level Autonomous movement, timed motor scripts, and TeleOp; turn-rate constants are unchanged. The field and inspection bench share one lightweight procedural model based on Team 25444's supplied DECODE robot references: an axle-height truss chassis with a closed cross-braced rear, 96 mm yellow mecanum wheels, an elevated brush intake with two rising transfer shafts, and a rotating ring-gear shooter with one centered flywheel and motor, a feeder, a CAD-profile servo-adjustable hood, and a visible five-inch artifact chamber. The turret remains animated, but its motor is not rendered as an exposed component. Visible wheels use diagonal FL/RR and FR/RL roller handedness and follow signed motor powers, intake shafts turn toward or away from the transfer path, flywheel animation follows recorded RPM in the artifact-feed direction, and the hood extends or retracts along its curved rack according to the launch angle stored in each telemetry frame. The rack drive is implicit rather than rendering a gear, and the support link follows the moving hood attachment so live runs and playback share the same mechanism state.

This improves visual and control fidelity but remains a simplified model rather than execution of real FTC SDK code or a full CAD dynamics simulation. The supplied 442 MB STEP assembly is too heavy to ship as the runtime model, so the browser geometry is reconstructed from its high-resolution renders, readable assembly labels, and dimensional anchors including the 96 mm wheels and five-inch artifact.

## TeleOp gamepad behavior

- A physical controller is read through the browser Gamepad API; the first connected controller becomes `gamepad1`.
- With no physical controller, the on-screen controller supplies the same `gamepad1` values.
- The TeleOp code editor parses simple bindings such as `if (gamepad1.a) shoot(60);` and stick/trigger thresholds.
- Bindings feed the established TeleOp motor, artifact, physics-recording, scoring, telemetry, and AI-analysis path.
- Dual-driver assignment is not exposed. The merged prototype attempted to introduce a second, competing TeleOp engine, so the repaired implementation intentionally keeps one reliable driver path.

## Robot preview page

`/robot-preview` is an internal inspection and tuning bench, not a second simulator. It renders the same simplified Team 25444-inspired robot used on the field in its own Three.js canvas and provides sliders for the eight motor channels plus feeder and hood servos. It is useful for checking mechanism orientation, channel naming, and animation in isolation. It does not run field physics, scoring, missions, telemetry, or AI analysis and is intentionally not linked as a primary homepage destination.

## Configuration and commands

Copy `my-app/frontend/.env.example` to `.env.local`. Leave `OPENAI_API_KEY=mock` for deterministic local feedback; use only server-side `OPENAI_API_KEY` and optional `OPENAI_MODEL` values.

Run from `my-app/frontend`:

```powershell
corepack pnpm install
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm start
```

There is no automated test runner yet.

## Known limitations and debt

1. No FTC SDK execution, complete rules model, multiple active robots/seasons, UI CAD import, accounts, persistence, or connected team dashboards.
2. No automated tests or CI for parsing, coordinates, scoring, analysis, Autonomous, or TeleOp.
3. TeleOp recording and high-frequency browser state work still need stronger bounds and profiling for long sessions.
4. Scoring data should be consolidated into one authoritative tested module.
5. The simulator repairs custom timeline state with a Rapier recording pass, which remains complex.
6. The high-poly field visual mesh is also used for collision and should be replaced incrementally with simpler colliders.
7. The simulator, scene, and analysis route are large and need incremental separation.
8. `/api/analyze` still needs deployment authentication, rate limiting, and provider observability.

## Verification (2026-07-15 merge repair)

- ESLint: pass with no warnings.
- TypeScript (`tsc --noEmit`): pass.
- Next.js production build: pass; all ten application routes generated successfully.
- API smoke checks: valid mock analysis request returned 200 with structured goal comparison; invalid request returned 400.
- Browser checks: homepage Sandbox/Learning split and requested loop wording rendered; `/learn` exposed three placeholder level entries; the default Autonomous run completed with one classified goal, 3 points, telemetry, playback, and deterministic analysis.
- TeleOp checks: gamepad UI remained absent from Autonomous, appeared only after selecting TeleOp, rendered the virtual controller and parsed binding cards, and completed the established TeleOp start/stop and analysis-unlock lifecycle.
- Binding smoke check: virtual stick/trigger snapshots parsed into active drive and flywheel bindings with the expected normalized values.
- Robot inspection: `/robot-preview` rendered the isolated CAD-informed bench, and its mechanism-demo action drove all eight channel controls.
- Browser console: no application errors; Three.js/Rapier dependency deprecation warnings remain.
- Local development: the generated Next cache was cleared after the broken merge/build overlap, and a fresh dev server now serves the current stylesheet without continuous refresh behavior.

## Verification (2026-07-17 learning levels)

- ESLint, TypeScript, and the Next.js production build pass.
- The published Level 2A, 2B, 3A, and 3B solutions pass direct production-parser assertions. The checks confirm motor powers, `wait()`/`sleep()` timing, Java wrapper handling, `waitForStart()`, shooting, and explicit motor shutdown.
- Levels 2B and 3B reuse the proven Level 1B shooting pose in internal field coordinates, and the preliminary shot-quality telemetry recognizes the curriculum's 2400 RPM / 60-degree shot before recorded field physics supplies authoritative scoring.
- `/learn` returns 200 and server-renders all three level titles plus six guided scenario links.
- The Level 3 guided simulator URL returns 200 with the simulator shell.
- A scenario-aware `/api/analyze` smoke request returned generated feedback from `gpt-5.6-terra`, including five run-specific evidence items.
- A Level 1B regression smoke request using display pose `(72, 90, 145)` returned `complete` from `gpt-5.6-terra`; the response did not mention internal `y=54` or misread the 60-degree angle as 60 requested shots.
- The in-app browser connection did not retain a controllable local test tab, so interactive visual verification remains to be repeated manually.
