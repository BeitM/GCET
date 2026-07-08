"""Convert a STEP assembly to a GLB using FreeCAD's command-line runtime.

Usage:
    freecadcmd convert_step_to_glb.py input.step output.glb
"""

from pathlib import Path
import os
import sys

import FreeCAD as App
import Import


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


input_value = os.environ.get("ROBOLAB_STEP_INPUT")
output_value = os.environ.get("ROBOLAB_GLB_OUTPUT")

if not input_value or not output_value:
    if len(sys.argv) < 3:
        fail("Set ROBOLAB_STEP_INPUT and ROBOLAB_GLB_OUTPUT or pass input and output paths.")
    input_value = sys.argv[-2]
    output_value = sys.argv[-1]

input_path = Path(input_value).resolve()
output_path = Path(output_value).resolve()

if not input_path.exists():
    fail(f"Input file does not exist: {input_path}")

output_path.parent.mkdir(parents=True, exist_ok=True)

document = App.newDocument("RoboLabFieldConversion")
print(f"Importing {input_path}")
Import.insert(str(input_path), document.Name)
document.recompute()

exportable = [
    obj
    for obj in document.Objects
    if hasattr(obj, "Shape") and not obj.Shape.isNull() and obj.Shape.Volume > 0
]

if not exportable:
    fail("The STEP assembly did not produce any solid shapes.")

minimum = App.Vector(float("inf"), float("inf"), float("inf"))
maximum = App.Vector(float("-inf"), float("-inf"), float("-inf"))

for obj in exportable:
    bounds = obj.Shape.BoundBox
    minimum.x = min(minimum.x, bounds.XMin)
    minimum.y = min(minimum.y, bounds.YMin)
    minimum.z = min(minimum.z, bounds.ZMin)
    maximum.x = max(maximum.x, bounds.XMax)
    maximum.y = max(maximum.y, bounds.YMax)
    maximum.z = max(maximum.z, bounds.ZMax)

print(f"Exporting {len(exportable)} solid objects")
print(
    "Assembly bounds (mm): "
    f"{maximum.x - minimum.x:.1f} × "
    f"{maximum.y - minimum.y:.1f} × "
    f"{maximum.z - minimum.z:.1f}"
)

import ImportGui

ImportGui.export(exportable, str(output_path))
App.closeDocument(document.Name)

if not output_path.exists() or output_path.stat().st_size == 0:
    fail("FreeCAD completed without creating a GLB file.")

print(f"Created {output_path} ({output_path.stat().st_size / 1_048_576:.2f} MiB)")
App.exit()
