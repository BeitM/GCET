# RoboLab field model handoff

Place optimized web field models in this directory.

## Preferred delivery

- Provide the original CAD assembly for reference and a `.glb` or `.gltf` export when possible.
- Use meters as the model unit.
- Put the origin at the center of the field floor.
- Use Y as the vertical axis.
- Name important meshes clearly, especially walls, goals, ramps, gates, and movable game elements.
- Keep visual meshes separate from simplified collision geometry.
- Include texture files when they are not embedded in the model.

## Web preparation targets

- Remove internal fasteners and geometry that cannot be seen during simulation.
- Reduce repeated high-detail hardware to simple meshes or instances.
- Prefer a total download below 15 MB for the initial field.
- Keep textures at 2048 px or below unless a larger source is specifically needed.
- Do not merge movable game elements into the static field mesh.

## Current DECODE asset

`decode-field.glb` was generated from the official full-field STEP assembly supplied for the 2025–2026 DECODE season.

The runtime asset intentionally contains only season-specific static structures:

- red and blue goals
- ramps and gates
- the obelisk structure

The floor, perimeter, markings, robot, and future movable game elements remain separate simulation objects. Detailed fasteners and internal hardware were excluded because they do not affect the visual or physical simulation.

Conversion details are recorded in:

- `decode-field.source-report.json` — STEP filtering and tessellation
- `decode-field.report.json` — final GLB mesh statistics

Rapier should continue to use purpose-built, low-complexity colliders instead of deriving collision geometry from the visual GLB.
