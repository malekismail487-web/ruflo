import bpy
import math
from mathutils import Vector

# --- Constants & Scaling ---
G = 6.67430e-11  # m^3 kg^-1 s^-2
M_EARTH = 5.972

bpy.context.scene.render.filepath = "C:/Users/loka3/.gemini/antigravity/scratch/ruflo/scratch/frame_####.png"


bpy.ops.render.render(animation=True)
