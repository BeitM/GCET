# RoboLab FTC

> AI-powered virtual simulation and debugging feedback for FTC programmers.

RoboLab FTC is a GCET project exploring how AI can help robotics students connect code, simulation data, and robot behavior. The platform is designed for FIRST Tech Challenge (FTC) programmers who want to test robot programs in a virtual field environment, inspect telemetry, and receive AI-guided feedback that explains what happened, why it happened, and how the code could be debugged or improved.

## Project Vision

FTC programming is difficult because code errors often appear as physical robot behavior. A small mistake may show up as drifting, overshooting, weak shooting, incorrect subsystem timing, or unexpected sensor behavior rather than an obvious code error.

Existing FTC simulation tools can show what a virtual robot does, but they are not always fully diagnostic or adaptive. RoboLab FTC focuses on the missing educational layer: an AI mentor that uses the user's goal, robot code, simulation telemetry, and subsystem behavior to provide tailored explanations, debugging suggestions, and optimization feedback.

The long-term goal is to turn simulation into an interactive coaching experience: students should not only see what their robot did, but understand why it happened and what to try next.

## Core Idea

**Goal + Code + Virtual Simulation + Telemetry → AI Feedback + Debugging / Optimization Suggestions**

A user should be able to:

1. Describe what the robot is supposed to accomplish.
2. Run robot code in a virtual FTC-style field.
3. Watch a preset simulated robot execute the behavior.
4. Inspect telemetry from drivetrain movement, motors, sensors, and subsystems.
5. Receive AI mentor feedback explaining bugs, mismatches, safety concerns, or optimization opportunities.

## Planned Features

### Current / Early Prototype Goals

- Virtual FTC-style field environment
- Preset simulated robot
- Support for key FTC subsystems:
  - drivetrain
  - arm / lift
  - shooter
  - intake
  - servo / claw
- User input for intended behavior, code, and robot setup
- Simulation telemetry dashboard
- AI-style mentor feedback panel
- Guided example scenarios for demonstration
- Debug report / summary output

### AI Mentor Feedback

The AI mentor should explain feedback in structured sections such as:

- **What happened** — a plain-English summary of the robot behavior
- **Likely cause** — what part of the code or setup may have caused the issue
- **Telemetry evidence** — what data supports the diagnosis
- **Suggested fix** — specific next debugging steps
- **Optimization idea** — ways to improve performance if the code works but could be better
- **Concept explanation** — beginner-friendly teaching about the robotics concept involved

## Example Use Cases

### Autonomous Routine Optimization

A team's autonomous routine successfully scores, but the robot takes extra turns and waits too long before firing. RoboLab FTC could explain that the code works but suggest a smoother path, earlier shooter spin-up, or better timing between aiming and feeding.

### Shooter Timing Issue

If the feeder activates before the shooter reaches target velocity, RoboLab FTC could use telemetry to show that the actual RPM is below the target. The AI assistant would explain why this causes weak or inconsistent shots and suggest waiting until velocity is within range.

### Arm or Lift Safety Problem

If an arm motor continues running after reaching its target, RoboLab FTC could identify a missing stop condition or limit check. The simulation could show the arm moving past its safe range while the AI explains how encoders or limit switches can prevent damage.

### Drivetrain Drift

If the robot is supposed to drive straight but veers to one side, RoboLab FTC could compare heading, encoder values, and motor power to identify possible motor direction, wheel power, or control logic issues.

## Relationship to Existing FTC Simulators

FTC simulation tools such as Virtual Robot Simulator show that virtual robot testing is possible. RoboLab FTC does not aim to replace every existing simulator or rebuild a full physics engine from scratch. Instead, the project builds from the general premise of FTC simulation and focuses on the AI-powered learning layer: explaining simulation behavior, interpreting telemetry, and helping students debug and refine their code.

## Future Vision

Possible future features include:

- Custom robot configuration
- CAD-assisted robot import
- Robot generation based on image input
- Saved team projects and debugging history
- Integration with existing FTC simulation tools
- Live telemetry from real robots
- More advanced subsystem support, including computer vision and localization
- Public beta testing with FTC teams

## Team Members

- Matt Beitler
- Pearson Wu — UI/UX design, web development
- James Yang
- Annie Ye
- Dora Ai

## Getting Started

These instructions are for team members working on the web app locally.

### Prerequisites

- Node.js installed, preferably Node 18+
- `pnpm` installed globally:

```bash
npm install -g pnpm
```

Optional but helpful:

- Visual Studio Code
- GitHub Desktop or another Git client

### Clone and open the repo

If you do not already have the repository locally:

```bash
git clone https://github.com/BeitM/GCET
cd GCET
```

If you already have the project folder, open it in your terminal and continue.

### Install dependencies

```bash
cd my-app
pnpm install
```

### Start the development server

```bash
pnpm run dev
```

Then visit:

```bash
http://localhost:3000
```

## Scripts

From inside the app directory:

```bash
pnpm run dev
```

Starts the local development server.

```bash
pnpm run build
```

Builds the production version of the app.

```bash
pnpm run start
```

Runs the production build locally.

```bash
pnpm run lint
```

Runs lint checks.

## Development Notes

The first version should focus on proving the core experience:

**A student can run a simplified robot routine in a virtual FTC-style field, see telemetry, and receive AI-style debugging and optimization feedback based on what happened.**

For the early prototype, avoid overbuilding features such as full FTC SDK compilation, CAD import, real robot connection, user accounts, payments, or a database. Those can be future features once the core simulation and AI mentor loop works.
