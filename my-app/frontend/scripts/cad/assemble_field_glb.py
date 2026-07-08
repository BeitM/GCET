"""Assemble coarse field OBJ categories and export a centered GLB in Blender."""

from pathlib import Path
import json
import os

import bpy
from mathutils import Vector


input_dir = Path(os.environ["ROBOLAB_MESH_INPUT_DIR"]).resolve()
output_path = Path(os.environ["ROBOLAB_GLB_OUTPUT"]).resolve()

COLORS = {
    "red": (0.78, 0.025, 0.045, 1.0),
    "blue": (0.035, 0.07, 0.58, 1.0),
    "green": (0.03, 0.62, 0.08, 1.0),
    "purple": (0.43, 0.04, 0.55, 1.0),
    "floor": (0.09, 0.095, 0.105, 1.0),
    "glass": (0.48, 0.58, 0.62, 0.22),
    "neutral": (0.42, 0.45, 0.46, 1.0),
}

DECIMATE_RATIOS = {
    "red": 1.0,
    "blue": 1.0,
    "green": 0.30,
    "purple": 0.30,
    "floor": 0.08,
    "glass": 0.50,
    "neutral": 1.0,
}

bpy.ops.wm.read_factory_settings(use_empty=True)

for category, color in COLORS.items():
    obj_path = input_dir / f"decode-{category}.obj"
    if not obj_path.exists():
        continue

    before = set(bpy.context.scene.objects)
    bpy.ops.wm.obj_import(filepath=str(obj_path), forward_axis="NEGATIVE_Y", up_axis="Z")
    imported = [obj for obj in bpy.context.scene.objects if obj not in before and obj.type == "MESH"]

    material = bpy.data.materials.new(f"decode-{category}")
    material.diffuse_color = color
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = color
    material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.72
    if category == "glass":
        material.surface_render_method = "DITHERED"
        material.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = color[3]

    for obj in imported:
        obj.name = f"decode-{category}"
        obj.data.materials.clear()
        obj.data.materials.append(material)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        if DECIMATE_RATIOS[category] < 1:
            modifier = obj.modifiers.new(name="Web simplification", type="DECIMATE")
            modifier.ratio = DECIMATE_RATIOS[category]
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("No category OBJ meshes were imported.")

corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
for obj in meshes:
    obj.location.x *= 0.001
    obj.location.y *= 0.001
    obj.location.z = (obj.location.z - minimum.z) * 0.001
    obj.scale = (0.001, 0.001, 0.001)

bpy.context.view_layer.objects.active = meshes[0]
for obj in meshes:
    obj.select_set(True)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

output_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(output_path),
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_cameras=False,
    export_lights=False,
)

triangles = sum(len(obj.data.loop_triangles) for obj in meshes)
report = {
    "mesh_objects": len(meshes),
    "triangles": triangles,
    "materials": len({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}),
    "output_bytes": output_path.stat().st_size,
}
(output_path.with_suffix(".report.json")).write_text(json.dumps(report, indent=2), encoding="utf-8")
print(f"ROBOLAB_EXPORT_REPORT {json.dumps(report)}")
