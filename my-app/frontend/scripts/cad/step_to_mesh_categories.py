"""Create coarse, material-grouped OBJ meshes from a STEP assembly.

Run with FreeCADCmd and set:
    ROBOLAB_STEP_INPUT
    ROBOLAB_MESH_OUTPUT_DIR
"""

from pathlib import Path
import json
import os
import sys

import FreeCAD as App
import Import
import Mesh
import MeshPart


input_path = Path(os.environ["ROBOLAB_STEP_INPUT"]).resolve()
output_dir = Path(os.environ["ROBOLAB_MESH_OUTPUT_DIR"]).resolve()
output_dir.mkdir(parents=True, exist_ok=True)

SKIP_TERMS = (
    "screw",
    "washer",
    "rivet",
    "cable tie",
    "quick release pin",
    "panel link",
    "hinge",
    "molded under tile disk",
    "nut ",
    " nut",
    "bolt",
    "spacer",
    "bearing",
    "gate",
)

INCLUDE_TERMS = (
    "goal",
    "ramp",
    "gate",
    "obelisk",
)

CATEGORIES = (
    "red",
    "blue",
    "green",
    "purple",
    "floor",
    "glass",
    "neutral",
)


def category_for(labels) -> str:
    for label in labels:
        value = label.lower()
        colors = [color for color in ("green", "purple", "red", "blue") if color in value]
        if len(colors) == 1:
            return colors[0]

    value = " ".join(labels).lower()
    if any(term in value for term in ("tile", "floor", "mat")):
        return "floor"
    if any(term in value for term in ("glass", "polycarbonate", "lexan")):
        return "glass"
    return "neutral"


def lineage_labels(obj):
    """Collect the part label plus parent assembly labels for inherited color/type."""
    labels = []
    pending = [obj]
    visited = set()
    while pending:
        current = pending.pop()
        if current.Name in visited:
            continue
        visited.add(current.Name)
        labels.append(current.Label or current.Name)
        pending.extend(current.InList)
    return labels


document = App.newDocument("RoboLabCoarseField")
print(f"Importing {input_path}", flush=True)
Import.insert(str(input_path), document.Name)
document.recompute()

meshes = {category: Mesh.Mesh() for category in CATEGORIES}
counts = {category: 0 for category in CATEGORIES}
skipped = 0
excluded_environment = 0
failed = 0

solid_objects = [
    obj
    for obj in document.Objects
    if hasattr(obj, "Shape") and not obj.Shape.isNull() and obj.Shape.Volume > 0
]

objects = [
    obj
    for obj in solid_objects
    if not any(
        hasattr(child, "Shape") and not child.Shape.isNull() and child.Shape.Volume > 0
        for child in obj.OutList
    )
]

for index, obj in enumerate(objects, start=1):
    label = (obj.Label or obj.Name).strip()
    lowered = label.lower()
    labels = lineage_labels(obj)
    context = " ".join(labels).lower()
    if any(term in lowered for term in SKIP_TERMS):
        skipped += 1
        continue
    if not any(term in context for term in INCLUDE_TERMS):
        excluded_environment += 1
        continue

    try:
        coarse = MeshPart.meshFromShape(
            Shape=obj.Shape,
            LinearDeflection=5.0,
            AngularDeflection=0.65,
            Relative=False,
        )
        category = category_for(labels)
        meshes[category].addMesh(coarse)
        counts[category] += 1
    except Exception as error:
        failed += 1
        print(f"Skipped unreadable shape {label}: {error}", flush=True)

    if index % 250 == 0:
        print(f"Meshed {index}/{len(objects)} objects", flush=True)

outputs = []
for category, mesh in meshes.items():
    if mesh.CountFacets == 0:
        continue
    path = output_dir / f"decode-{category}.obj"
    mesh.write(str(path))
    outputs.append({
        "category": category,
        "path": path.name,
        "vertices": mesh.CountPoints,
        "triangles": mesh.CountFacets,
        "objects": counts[category],
    })
    print(f"{category}: {mesh.CountFacets} triangles", flush=True)

metadata = {
    "source": input_path.name,
    "source_objects": len(objects),
    "source_solid_objects_including_assemblies": len(solid_objects),
    "skipped_hardware_objects": skipped,
    "excluded_environment_objects": excluded_environment,
    "failed_objects": failed,
    "linear_deflection_mm": 5.0,
    "angular_deflection_radians": 0.65,
    "meshes": outputs,
}

(output_dir / "decode-mesh-report.json").write_text(
    json.dumps(metadata, indent=2),
    encoding="utf-8",
)

print(f"Created {len(outputs)} category meshes in {output_dir}", flush=True)
App.closeDocument(document.Name)
