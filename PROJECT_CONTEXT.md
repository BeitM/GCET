# RoboLab FTC — Project Context

Snapshot: 2026-07-21. Active branch and Vercel production branch: `main`, including the progressive six-lesson curriculum, opt-in AI guidance, and the browser-side robot code IDE.

## Product and current scope

RoboLab FTC is a browser-based robotics learning prototype. A user supplies a goal and supported robot-command code, configures a DECODE field and robot, runs an Autonomous or TeleOp simulation, reviews 3D playback, scoring, and telemetry, and receives deterministic coaching without a valid OpenAI key or generated coaching when one is configured.

The prototype does not compile arbitrary JavaScript or FTC SDK Java and is not a complete rules-accurate simulator.

## Primary user flows

1. The homepage presents an unrestricted **Sandbox** and a **Structured Learning** path.
2. Sandbox opens the complete simulator with a blank, prompted Robot goal followed by Robot code, Simulation mode, Code complexity, Robot preset, and Field configuration. Learning opens `/learn`, where each level offers two guided scenarios before launching the shared simulator with a combined Learning objective and scenario card followed by Robot code; Learning hides the mode selector and currently fixes every lesson to Autonomous. Each lesson supplies fixed code complexity, a matching partial starter scaffold, controlled field artifacts, setup, and a concise success-criteria checklist. Robot goal/Learning objective and Robot code open by default, while the remaining setup cards start collapsed. Previous/next controls follow all six lessons in order, including transitions between levels.
3. The curriculum builds FTC robot capabilities in sequence: drivetrain movement, fixed-pose shooting, intake while driving, collection and retreat, a preload autonomous, and a full collect-and-score cycle. Its code interface still progresses from readable action commands, to FTC-style motor `setPower()` calls with explicit timing, to a supported `LinearOpMode`-shaped Java subset using `waitForStart()` and `sleep(milliseconds)`. Guided starters intentionally leave required commands as TODOs instead of supplying a working solution. Autonomous parses only the documented subset; it does not compile arbitrary Java or the FTC SDK.
4. TeleOp uses the same simulation, physics-recording, scoring, telemetry, and analysis path as Autonomous. It accepts keyboard controls plus `gamepad1` bindings from either the first connected browser gamepad or the on-screen virtual controller.
5. Gamepad controls and UI appear only after TeleOp is selected. Keyboard input remains available as a fallback.
6. Completing a run never starts analysis automatically. Sandbox unlocks **Get AI feedback** after a run. Learning unlocks a deterministic, browser-local **Check solution** action plus a separate optional **Get AI feedback** action; only the local check controls lesson completion and continuation. AI analysis receives bounded code, setup information, compact telemetry, recent chat, and the active learning level/scenario criteria. Before submission, recorded internal field positions are converted to the selected corner- or center-origin display coordinates so AI comparisons match the user's code. Generated advice is instructed to stay within the selected syntax complexity and assess the chosen scenario. It provides deterministic feedback only when the server key is missing, explicitly set to `mock`, or rejected as invalid. With a valid configured key, OpenAI generates the complete visible feedback structure and follow-up answers; provider failures surface as errors rather than silently falling back. The feedback header identifies the active model or local fallback source.
7. The Robot Code section is a browser-side mock IDE over the same plain code string consumed by simulation and analysis. It provides Java-aware syntax colors, line numbers, contextual Autonomous or TeleOp completions, automatic indentation and bracket pairing, block indentation, comment toggling, a movable and resizable floating workspace on desktop, and editor status without compiling Java or changing the supported simulator subset. Parameterized autocomplete inserts an empty call and places the caret between its parentheses; the separate Commands reference retains concrete example values. Its chrome follows RoboLab's panel palette, its compact view uses a roomier two-row toolbar with reduced status metadata, and its floating Commands and Collapse controls use larger targets. Narrow screens retain a viewport-filling editor fallback. The simulator run/analysis controls remain pinned below the independently scrolling desktop setup form. All setup cards are collapsible; the goal/objective and code cards open by default and the rest start in their title-only state.

## Architecture and entry points

- Next.js 16.2.9 App Router, React 19.2.4, strict TypeScript 5, and Tailwind CSS 4.
- Three.js, React Three Fiber/Drei, and React Three Rapier provide the 3D field and physics.
- Simulation, input evaluation, recording, and scoring run in the browser; public `POST /ftc/api/analyze` runs on the Node runtime through the app-local `/api/analyze` route.
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
  src/components/RobotCodeEditor.tsx   Browser-side mock IDE and contextual code completion
  src/lib/autonomous.ts                Autonomous command parser and command types
  src/lib/motors.ts                    Eight-channel motor helpers
  src/lib/learning.ts                  Complexity levels and six scenarios
  src/lib/learningEvaluation.ts        Deterministic browser-local lesson checks
  src/lib/teleop.ts                    Gamepad snapshots and binding parser
  src/lib/types.ts                     Shared contracts
```

## Motor model

The current script interface retains four mecanum drive channels, an intake channel, two mirrored flywheel channel names, and a turret channel for compatibility. Autonomous supports calls such as `frontLeftDrive.setPower(0.6)` and `wait(seconds)` for open-loop motor movement. In Level 1, `turn(degrees)` rotates relative to the robot's current heading while `turnTo(heading)` targets an absolute field heading. Levels 2 and 3 separate shooter setup from firing with `setHoodAngle(degrees)` followed by `shoot()`, while Level 1 retains the `shoot(angle)` shortcut. Its level-three parser also recognizes `waitForStart()` and converts `sleep(milliseconds)` to simulator time while ignoring supported Java class boilerplate. Robot translation uses a shared 0.75 speed scale for high-level Autonomous movement, timed motor scripts, and TeleOp; turn-rate constants are unchanged. The field and inspection bench share one lightweight procedural model based on Team 25444's supplied DECODE robot references: an axle-height truss chassis with a closed cross-braced rear, 96 mm yellow mecanum wheels, an elevated brush intake with two rising transfer shafts, and a rotating ring-gear shooter with one centered flywheel and motor, a feeder, a CAD-profile servo-adjustable hood, and a visible five-inch artifact chamber. The turret remains animated, but its motor is not rendered as an exposed component. Visible wheels use diagonal FL/RR and FR/RL roller handedness and follow signed motor powers, intake shafts turn toward or away from the transfer path, flywheel animation follows recorded RPM in the artifact-feed direction, and the hood extends or retracts along its curved rack according to the launch angle stored in each telemetry frame. The rack drive is implicit rather than rendering a gear, and the support link follows the moving hood attachment so live runs and playback share the same mechanism state.

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
8. `/ftc/api/analyze` still needs deployment authentication, rate limiting, and provider observability.

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
- A Level 2B browser run using mirrored flywheel power, `setHoodAngle(60)`, `wait(1.5)`, and `shoot()` recorded one classified shot for 3 points; generated feedback correctly marked the lesson complete without mistaking hood motion for drivetrain movement.
- `/learn` returns 200 and server-renders all three level titles plus six guided scenario links.
- The Level 3 guided simulator URL returns 200 with the simulator shell.
- A scenario-aware `/api/analyze` smoke request returned generated feedback from `gpt-5.6-terra`, including five run-specific evidence items.
- A Level 1B regression smoke request using display pose `(72, 90, 145)` returned `complete` from `gpt-5.6-terra`; the response did not mention internal `y=54` or misread the 60-degree angle as 60 requested shots.
- The in-app browser connection did not retain a controllable local test tab, so interactive visual verification remains to be repeated manually.

## Verification (2026-07-20 robot code IDE)

- ESLint, TypeScript, and the Next.js production build pass.
- Browser checks confirmed Java-aware token classes for annotations, classes, keywords, functions, variables, strings, numbers, operators, and punctuation; contextual completion insertion and argument selection; bracket pairing; block indentation; and comment toggling.
- Floating-editor checks confirmed a centered desktop window rendered in a top-level overlay above the 3D field, with larger code metrics, visible simulator context behind it, a draggable title bar, a dedicated resize handle, command-reference layering, edit and cursor continuity, and Collapse/Escape exits. Narrow screens retain the viewport-filling fallback.
- The editor header no longer uses decorative macOS window controls; its file badge and title bar use RoboLab's purple/dark panel styling. Desktop checks at 1280x720 confirmed that Run simulation and Start TeleOp remain visible in a fixed action footer while setup scrolls independently; the 800px responsive layout returns to normal document flow.
- All six Sandbox setup cards expanded and collapsed from their title rows and retained the appropriate Autonomous or TeleOp controls. Robot goal and Robot code opened by default while the remaining cards started closed. The compact code card rendered at 420px with a two-row toolbar and only editing/cursor status; expanded mode restored the complete status bar. The responsive 800px editor rendered at 400px while actions remained in normal flow.
- Sandbox rendered a blank, prompted Robot goal and Robot code before Simulation mode and the remaining setup cards. Beginner Learning rendered a combined Learning objective/scenario card followed by Robot code; advanced Learning kept Robot preset and Field configuration after those two. Learning objective and Robot code opened by default. Learning exposed no mode selector or virtual gamepad and remained Autonomous. The editor exposed only Commands and Expand/Collapse, with 94×34px expanded action targets.
- Sandbox-level and Learning-scenario URL updates preserve the configured `/ftc` base path, so refreshing after a selection does not fall through to the unmounted `/simulator` route.
- The default Autonomous program still completed playback with one classified goal, 3 points, telemetry, and local fallback analysis.
- TeleOp kept its editor suggestions limited to supported actions and `gamepad1` controls, exposed the virtual controller only in TeleOp, and completed the existing start/stop and analysis-unlock lifecycle.
- Browser console output contained only the existing Three.js and Rapier initialization deprecation warnings.

## Verification (2026-07-21 progressive lessons and opt-in feedback)

- ESLint, TypeScript, and the Next.js production build pass.
- `/learn` renders the six-skill sequence: movement, shooting, intake, collection/retreat, preload autonomous, and a full collect-and-score cycle.
- The published 1B solution completed locally with one 2400 RPM / 60-degree blue classified shot for 3 points. Playback left the AI panel closed; **Check solution** marked the lesson complete, and **Get AI feedback** opened generated coaching only after it was clicked.
- The calibrated 2A solution drove 10.1 inches, collected exactly one center-row artifact, retained it, stopped every motor, and passed the deterministic lesson check.
- Artifact data is normalized into the simulator's canonical coordinate system while retaining the established DECODE field locations. Level 2A moves the robot start to `(52, 84)` at 180 degrees so the intake faces the unchanged center-row artifacts; the intended approach collects one, while an otherwise identical run turned to 0 degrees records zero collected and zero stored artifacts.
- The published 3B `LinearOpMode`-shaped solution uses the revised `(39, 60, 180)` collection target, collected two available row artifacts, returned to the proven launch pose, scored one collected artifact, gated actions with `waitForStart()`, stopped every motor, and passed all local checks.
- Sandbox exposes **Get AI feedback** without a **Check solution** action. Representative completed runs did not create an analysis panel automatically, and the browser console reported no errors.
- Lesson 1A's expected internal final position was corrected to match its 24-inch forward and 12-inch right route. The published `turnTo(90)` solution now passes separate position and field-heading checks; `turnTo(30); turn(60);` also finishes at 90 degrees, verifying absolute and relative turn semantics from a nonzero heading.
- Lesson 1A now starts at the physical field center `(72, 72)` and its published route passes at the recalibrated endpoint. Accepting the `driveRight` completion inserts `driveRight();` with the caret inside the parentheses rather than copying the reference example's `12`; browser console checks remained clean.
- Autocomplete keyboard navigation no longer resets to the first suggestion on textarea keyup. Repeated Arrow Down/Up inputs retain the intended highlight, and Tab accepts the currently highlighted command with its argument caret placement intact.
- Autocomplete is context-aware: automatic and Ctrl+Space suggestions stay hidden inside `//` comments, `/* ... */` comments, and quoted strings, while remaining available on executable code lines.
- The suggestion menu measures available editor space, opens above or below with a six-pixel gap from the active line, and stays clamped inside the editor at a readable header-plus-row height even while the textarea scroll position is updating. Its viewport measurement reconnects when the editor moves between compact and expanded rendering, and the replacement textarea cancels the old textarea's delayed blur, preventing expanded suggestions from becoming invisible or disabled. Lesson 2A now starts from three concise, goal-aligned TODOs with executable code lines between them instead of a mostly completed intake routine. Its completion catalog uses the same `intake.setPower(...)` name as the lesson code, and its published solution still collects one artifact and passes all local checks.
