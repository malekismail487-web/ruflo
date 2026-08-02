import bpy
import math
from mathutils import Vector

# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Physical Constants
G = 6.67430e-11
M_EARTH = 5.972e24
M_MOON = 7.348e22
R_INIT_M = 3.844e8
SCALE = 3.844e7  # 1 BU = 3.844e7 meters
DT = 10800.0     # seconds per frame (3 hours)
FRAMES = 250

# Derived values
R_INIT_BU = R_INIT_M / SCALE  # 10.0 BU
V0 = math.sqrt(G * M_EARTH / R_INIT_M)  # Initial orbital velocity m/s

# Create Earth
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5, location=(0, 0, 0))
earth = bpy.context.active_object
earth.name = "Earth"
mat_earth = bpy.data.materials.new(name="EarthMat")
mat_earth.use_nodes = True
nodes = mat_earth.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
bsdf.inputs['Base Color'].default_value = (0.2, 0.3, 0.8, 1.0)  # Blue
bsdf.inputs['Roughness'].default_value = 0.5
earth.data.materials.append(mat_earth)

# Create Moon
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.4, location=(R_INIT_BU, 0, 0))
moon = bpy.context.active_object
moon.name = "Moon"
mat_moon = bpy.data.materials.new(name="MoonMat")
mat_moon.use_nodes = True
nodes = mat_moon.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
bsdf.inputs['Base Color'].default_value = (0.7, 0.7, 0.7, 1.0)  # Gray
bsdf.inputs['Roughness'].default_value = 0.9
moon.data.materials.append(mat_moon)

# Physics State (SI Units)
pos = Vector((R_INIT_M, 0.0, 0.0))
vel = Vector((0.0, V0, 0.0))

def acceleration(r_vec):
    r = r_vec.length
    if r == 0:
        return Vector((0.0, 0.0, 0.0))
    return -G * M_EARTH * r_vec / (r ** 3)

# Initial acceleration
acc = acceleration(pos)

# Velocity Verlet Integration
for frame in range(1, FRAMES + 1):
    # v(t + dt/2) = v(t) + a(t) * dt/2
    vel_half = vel + acc * (DT * 0.5)
    # x(t + dt) = x(t) + v(t + dt/2) * dt
    pos = pos + vel_half * DT
    # a(t + dt) = a(x(t + dt))
    acc_new = acceleration(pos)
    # v(t + dt) = v(t + dt/2) + a(t + dt) * dt/2
    vel = vel_half + acc_new * (DT * 0.5)
    acc = acc_new

    # Update Moon location in Blender Units
    moon_loc_bu = Vector((pos.x / SCALE, pos.y / SCALE, pos.z / SCALE))
    moon.location = moon_loc_bu
    moon.keyframe_insert(data_path="location", frame=frame)

# Camera Setup
bpy.ops.object.camera_add(location=(0, -30, 15))
cam = bpy.context.active_object
cam.name = "Camera"
# Point camera at origin
track = cam.constraints.new(type='TRACK_TO')
track.target = earth
track.track_axis = 'TRACK_NEGATIVE_Z'
track.up_axis = 'UP_Y'
bpy.context.scene.camera = cam

# Sun Light Setup
bpy.ops.object.light_add(type='SUN', location=(10, -10, 20))
sun = bpy.context.active_object
sun.name = "Sun"
sun.data.energy = 5.0

# Scene Settings
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.resolution_x = 800
scene.render.resolution_y = 600
scene.render.fps = 30

# Set view to camera
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        for space in area.spaces:
            if space.type == 'VIEW_3D':
                space.region_3d.view_perspective = 'CAMERA'
                break