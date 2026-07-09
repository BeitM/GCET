"""Inspect a STEP assembly in FreeCAD and write geometry statistics as JSON."""

from pathlib import Path
import json
import os

import FreeCAD as App
import Import


input_path = Path(os.environ["ROBOLAB_STEP_INPUT"]).resolve()
output_path = Path(os.environ["ROBOLAB_STEP_REPORT"]).resolve()

document = App.newDocument("RoboLabStepInspection")
print(f"Importing {input_path}", flush=True)
Import.insert(str(input_path), document.Name)
document.recompute()

solid_objects = [
    obj
    for obj in document.Objects
    if hasattr(obj, "Shape") and not obj.Shape.isNull() and obj.Shape.Volume > 0
]
leaf_objects = [
    obj
    for obj in solid_objects
    if not any(
        hasattr(child, "Shape") and not child.Shape.isNull() and child.Shape.Volume > 0
        for child in obj.OutList
    )
]

minimum = [float("inf")] * 3
maximum = [float("-inf")] * 3
parts = []

for obj in leaf_objects:
    bounds = obj.Shape.BoundBox
    values_min = [bounds.XMin, bounds.YMin, bounds.ZMin]
    values_max = [bounds.XMax, bounds.YMax, bounds.ZMax]
    for axis in range(3):
        minimum[axis] = min(minimum[axis], values_min[axis])
        maximum[axis] = max(maximum[axis], values_max[axis])
    parts.append({
        "label": obj.Label or obj.Name,
        "volume_mm3": obj.Shape.Volume,
        "dimensions_mm": [bounds.XLength, bounds.YLength, bounds.ZLength],
    })

parts.sort(key=lambda item: item["volume_mm3"], reverse=True)
report = {
    "source": input_path.name,
    "document_objects": len(document.Objects),
    "solid_objects_including_assemblies": len(solid_objects),
    "leaf_solids": len(leaf_objects),
    "bounds_min_mm": minimum,
    "bounds_max_mm": maximum,
    "dimensions_mm": [maximum[i] - minimum[i] for i in range(3)],
    "largest_parts": parts[:100],
}

output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({key: report[key] for key in report if key != "largest_parts"}, indent=2), flush=True)
App.closeDocument(document.Name)
