import bpy
import math

# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create red sphere
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(-2, 0, 0))
sphere = bpy.context.active_object
sphere.name = "RedSphere"

# Create red material
red_mat = bpy.data.materials.new(name="RedMaterial")
red_mat.use_nodes = True
nodes = red_mat.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
bsdf.inputs['Base Color'].default_value = (1.0, 0.0, 0.0, 1.0)
bsdf.inputs['Roughness'].default_value = 0.3
sphere.data.materials.append(red_mat)

# Create blue cube
bpy.ops.mesh.primitive_cube_add(size=2.0, location=(2, 0, 0))
cube = bpy.context.active_object
cube.name = "BlueCube"

# Create blue material
blue_mat = bpy.data.materials.new(name="BlueMaterial")
blue_mat.use_nodes = True
nodes = blue_mat.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
bsdf.inputs['Base Color'].default_value = (0.0, 0.0, 1.0, 1.0)
bsdf.inputs['Roughness'].default_value = 0.3
cube.data.materials.append(blue_mat)

# Add sun light
bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
sun = bpy.context.active_object
sun.name = "SunLight"
sun.data.energy = 5.0
sun.rotation_euler = (math.radians(-45), 0, math.radians(45))

# Add fill light
bpy.ops.object.light_add(type='POINT', location=(-5, -5, 5))
fill_light = bpy.context.active_object
fill_light.name = "FillLight"
fill_light.data.energy = 200.0

# Add camera
bpy.ops.object.camera_add(location=(0, -12, 6))
camera = bpy.context.active_object
camera.name = "MainCamera"
camera.rotation_euler = (math.radians(65), 0, 0)

# Set camera as active
bpy.context.scene.camera = camera

# Set render resolution
bpy.context.scene.render.resolution_x = 800
bpy.context.scene.render.resolution_y = 600
bpy.context.scene.render.resolution_percentage = 100

# Set output path
bpy.context.scene.render.filepath = "C:/Users/loka3/.gemini/antigravity/scratch/ruflo/scratch/red_sphere_blue_cube.png"
bpy.context.scene.render.image_settings.file_format = 'PNG'

# Render and save
bpy.ops.render.render(write_still=True)

print("Render completed and saved to:", bpy.path.abspath(bpy.context.scene.render.filepath))