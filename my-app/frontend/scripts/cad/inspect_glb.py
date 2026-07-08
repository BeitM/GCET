"""Print mesh and bounds information for a GLB using Blender."""

import os

import bpy
from mathutils import Vector


input_path = os.environ["ROBOLAB_GLB_INPUT"]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
vertices = sum(len(obj.data.vertices) for obj in meshes)
triangles = sum(len(obj.data.loop_triangles) for obj in meshes)
materials = {slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}

corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
dimensions = maximum - minimum

print("ROBOLAB_GLTF_REPORT")
print(f"mesh_objects={len(meshes)}")
print(f"vertices={vertices}")
print(f"triangles={triangles}")
print(f"materials={len(materials)}")
print(f"bounds_min={minimum.x:.4f},{minimum.y:.4f},{minimum.z:.4f}")
print(f"bounds_max={maximum.x:.4f},{maximum.y:.4f},{maximum.z:.4f}")
print(f"dimensions={dimensions.x:.4f},{dimensions.y:.4f},{dimensions.z:.4f}")
print("largest_meshes=")
for obj in sorted(meshes, key=lambda item: len(item.data.loop_triangles), reverse=True)[:20]:
    print(f"  {obj.name}: {len(obj.data.loop_triangles)} triangles")
