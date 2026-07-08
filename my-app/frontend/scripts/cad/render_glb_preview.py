"""Render an isometric QA preview of a GLB using Blender."""

import os

import bpy
from mathutils import Vector


input_path = os.environ["ROBOLAB_GLB_INPUT"]
output_path = os.environ["ROBOLAB_PREVIEW_OUTPUT"]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_path)

bpy.ops.mesh.primitive_plane_add(size=4.2, location=(0, 0, -0.015))
floor = bpy.context.object
floor_material = bpy.data.materials.new("preview-floor")
floor_material.diffuse_color = (0.035, 0.04, 0.045, 1)
floor.data.materials.append(floor_material)

bpy.ops.object.camera_add(location=(4.8, -5.6, 4.4))
camera = bpy.context.object
camera.rotation_euler = ((Vector((0, -0.55, 0.55)) - camera.location).to_track_quat("-Z", "Y")).to_euler()
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(1.5, -1.5, 5.5))
bpy.context.object.data.energy = 1500
bpy.context.object.data.shape = "DISK"
bpy.context.object.data.size = 5

bpy.ops.object.light_add(type="AREA", location=(-4, 2, 2.8))
bpy.context.object.data.energy = 900
bpy.context.object.data.size = 4
bpy.context.object.rotation_euler = ((Vector((0, 0, 0.6)) - bpy.context.object.location).to_track_quat("-Z", "Y")).to_euler()

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1100
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = output_path
scene.world = bpy.data.worlds.new("preview-world")
scene.world.color = (0.008, 0.012, 0.018)
scene.view_settings.look = "AgX - Medium High Contrast"

bpy.ops.render.render(write_still=True)
print(f"Created preview: {output_path}")
