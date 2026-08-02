import bpy
import math
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.render.filepath = "C:/Users/loka3/.gemini/antigravity/scratch/ruflo/scratch/forest_env_closeup.png"
bpy.ops.mesh.primitive_cylinder_add(radius=3.0, depth=10.0, location=(0,0,0))
bpy.ops.object.light_add(type='SUN', location=(10,15,20))
bpy.ops.object.camera_add(location=(6,-8,4), rotation=(math.radians(70), 0, math.radians(35)))
scene.camera = bpy.context.active_object
bpy.ops.render.render(write_still=True)
