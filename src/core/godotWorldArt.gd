extends Node3D

# A bounded scene compiler, not an asset loader. Every visible landscape,
# masonry surface, tower silhouette, and river strip is synthesized locally.
var design: Dictionary
var terrain_noise: FastNoiseLite
var detail_noise: FastNoiseLite
var ridge_noise: FastNoiseLite
var stone: Material
var trim: Material
var dark_stone: Material
var glass: Material
var river_material: Material
var grass_material: Material

func configure(data: Dictionary) -> void:
	design = data

func _ready() -> void:
	_setup_noise()
	_setup_materials()
	_build_atmosphere()
	_build_terrain()
	_build_distant_ridges()
	_build_river()
	_build_citadel()
	_build_approach()
	_build_vegetation()
	print("NYX_WORLD_READY terrain_vertices=", (int(design["terrain"]["resolution"]) + 1) * (int(design["terrain"]["resolution"]) + 1),
		" towers=", design["citadel"]["towerCount"])

func _setup_noise() -> void:
	var seed_value: int = int(design["seed"])
	terrain_noise = FastNoiseLite.new()
	terrain_noise.seed = seed_value
	terrain_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	terrain_noise.frequency = 0.014
	terrain_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	terrain_noise.fractal_octaves = 4
	detail_noise = FastNoiseLite.new()
	detail_noise.seed = seed_value + 919
	detail_noise.noise_type = FastNoiseLite.TYPE_PERLIN
	detail_noise.frequency = 0.085
	detail_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	detail_noise.fractal_octaves = 3
	ridge_noise = FastNoiseLite.new()
	ridge_noise.seed = seed_value + 1777
	ridge_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	ridge_noise.frequency = 0.027
	ridge_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	ridge_noise.fractal_octaves = 3

func _stone_shader(base_color: Color, grain: float) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
uniform vec4 base_tint : source_color = vec4(0.7, 0.7, 0.7, 1.0);
uniform float grain_strength = 0.16;
varying vec3 world_position;
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void vertex() { world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
    vec3 cell = floor(world_position * 2.8);
    float coarse = hash21(cell.xz + cell.y * 0.41);
    float fine = hash21(floor(world_position.xz * 13.0) + world_position.y * 3.0);
    float weather = smoothstep(0.3, 0.8, hash21(floor(world_position.xz * 0.36)));
    float v = 0.72 + grain_strength * (coarse * 0.72 + fine * 0.28) + weather * 0.09;
    ALBEDO = base_tint.rgb * COLOR.rgb * v;
    ROUGHNESS = 0.76 + 0.12 * coarse;
    METALLIC = 0.06;
}
"""
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("base_tint", base_color)
	material.set_shader_parameter("grain_strength", grain)
	return material

func _setup_materials() -> void:
	var palette: String = str(design["citadel"]["palette"])
	var base := Color("929ca2")
	var accent := Color("a79b7d")
	var dark := Color("344653")
	if palette == "obsidian":
		base = Color("777983")
		accent = Color("9a9ab0")
		dark = Color("242837")
	elif palette == "sandstone":
		base = Color("c9aa7b")
		accent = Color("d6bd85")
		dark = Color("6a5147")
	stone = _stone_shader(base, 0.26)
	trim = _stone_shader(accent, 0.12)
	dark_stone = _stone_shader(dark, 0.25)
	var pane := StandardMaterial3D.new()
	pane.albedo_color = Color("adbdc1")
	pane.metallic = 0.18
	pane.roughness = 0.15
	pane.emission_enabled = true
	pane.emission = Color("ffbb7b")
	pane.emission_energy_multiplier = 0.5
	glass = pane
	var water_shader := Shader.new()
	water_shader.code = """
shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_opaque;
varying vec3 world_position;
void vertex() { world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
    float ripple = sin(world_position.z * 2.7 + TIME * 1.3) * sin(world_position.x * 3.2 - TIME * 0.8);
    float vein = sin(world_position.z * 0.58 + world_position.x * 0.71 + TIME * 0.35);
    ALBEDO = mix(vec3(0.025, 0.16, 0.19), vec3(0.13, 0.33, 0.36), 0.5 + 0.3 * vein + 0.1 * ripple);
    METALLIC = 0.35;
    ROUGHNESS = 0.16;
    ALPHA = 0.88;
}
"""
	var water := ShaderMaterial.new()
	water.shader = water_shader
	river_material = water
	var terrain_shader := Shader.new()
	terrain_shader.code = """
shader_type spatial;
varying vec3 world_position;
float hash21(vec2 p) { return fract(sin(dot(p, vec2(123.13, 324.17))) * 43758.5453); }
float value_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void vertex() { world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
    vec2 p = world_position.xz;
    float biome = value_noise(p * 0.12);
    float grain = value_noise(p * 2.6);
    float pebble = value_noise(p * 8.2);
    float weather = 0.78 + 0.23 * biome + 0.13 * grain + 0.065 * pebble;
    ALBEDO = COLOR.rgb * weather;
    ROUGHNESS = 0.94;
    METALLIC = 0.0;
}
"""
	var land := ShaderMaterial.new()
	land.shader = terrain_shader
	grass_material = land

func _build_atmosphere() -> void:
	var mode: String = str(design["atmosphere"]["timeOfDay"])
	var sky_top := Color("263a5b")
	var horizon := Color("ba9b86")
	var sun_color := Color("f7dabb")
	if mode == "day":
		sky_top = Color("356a9b")
		horizon = Color("c9ddeb")
		sun_color = Color("f3f0e0")
	elif mode == "dawn":
		sky_top = Color("435179")
		horizon = Color("c6a29a")
		sun_color = Color("efd0b0")
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = sky_top
	sky_material.sky_horizon_color = horizon
	sky_material.ground_bottom_color = Color("38424d")
	sky_material.ground_horizon_color = horizon.darkened(0.25)
	sky_material.sun_angle_max = 20.0
	var sky := Sky.new()
	sky.sky_material = sky_material
	var environment := Environment.new()
	environment.background_mode = Environment.BG_SKY
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("d8e0d8")
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_BG
	environment.ambient_light_energy = 0.67
	environment.fog_enabled = float(design["atmosphere"]["fogDensity"]) > 0.0
	environment.fog_light_color = sky_top.lerp(horizon, 0.36)
	environment.fog_density = float(design["atmosphere"]["fogDensity"])
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	if RenderingServer.get_current_rendering_method() == "forward_plus":
		environment.ssao_enabled = true
		environment.ssao_radius = 2.0
		environment.ssao_intensity = 0.85
		environment.ssil_enabled = true
		environment.glow_enabled = true
	var node := WorldEnvironment.new()
	node.environment = environment
	add_child(node)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-38, -35, 0) if mode != "day" else Vector3(-47, -65, 0)
	sun.light_color = sun_color
	sun.light_energy = 0.72
	sun.shadow_enabled = true
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-40, 140, 0)
	fill.light_color = Color("e5e5d4")
	fill.light_energy = 0.52
	add_child(fill)

func _smooth(a: float, b: float, x: float) -> float:
	var t: float = clampf((x - a) / (b - a), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)

func _river_x(z: float) -> float:
	return -18.0 + sin(z * 0.045 + float(int(design["seed"]) % 97) * 0.08) * 6.0

func terrain_height(x: float, z: float) -> float:
	var t: Dictionary = design["terrain"]
	var c: Dictionary = design["citadel"]
	var extent: float = float(t["extent"])
	var base: float = terrain_noise.get_noise_2d(x, z) * float(t["relief"]) * 0.54
	var detail: float = detail_noise.get_noise_2d(x, z) * 0.78
	var ridge: float = 1.0 - absf(ridge_noise.get_noise_2d(x, z))
	var flank: float = _smooth(12.0, extent * 0.42, absf(x))
	var rear: float = _smooth(extent * 0.22, extent * 0.48, -z)
	var h: float = -1.4 + base + detail + float(t["ridgeStrength"]) * (flank * 0.62 + rear * 0.53) * (0.42 + 0.58 * ridge * ridge)
	var distance: float = Vector2(x - float(c["center"][0]), z - float(c["center"][1])).length()
	var plateau: float = 1.0 - _smooth(float(c["radius"]) + 2.0, float(c["radius"]) + 9.0, distance)
	h = lerpf(h, 4.5, plateau)
	var river_distance: float = absf(x - _river_x(z))
	var river: float = 1.0 - _smooth(float(t["riverWidth"]) * 0.72, float(t["riverWidth"]) * 1.8, river_distance)
	h -= river * 3.2
	return h

func _terrain_color(x: float, z: float, h: float, normal: Vector3) -> Color:
	var moss := Color("38533c")
	var field := Color("7c805a")
	var rock := Color("77745f")
	var pale := Color("a5a49a")
	var slope: float = 1.0 - normal.y
	var grain: float = detail_noise.get_noise_2d(x + 200.0, z - 300.0)
	var out: Color = moss.lerp(field, clampf(0.45 + grain * 0.35, 0.0, 1.0))
	out = out.lerp(rock, _smooth(0.30, 0.72, slope))
	out = out.lerp(pale, _smooth(20.0, 30.0, h))
	if absf(x - _river_x(z)) < float(design["terrain"]["riverWidth"]) * 1.5:
		out = out.lerp(Color("665f4d"), 0.32)
	return out

func _terrain_mesh(resolution: int, extent: float, for_collision: bool = false) -> ArrayMesh:
	var side: int = resolution + 1
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	var colors := PackedColorArray()
	var uv := PackedVector2Array()
	vertices.resize(side * side)
	normals.resize(side * side)
	colors.resize(side * side)
	uv.resize(side * side)
	for z in range(side):
		for x in range(side):
			var px: float = (float(x) / float(resolution) - 0.5) * extent
			var pz: float = (float(z) / float(resolution) - 0.5) * extent
			var py: float = terrain_height(px, pz)
			var i: int = z * side + x
			vertices[i] = Vector3(px, py, pz)
			var eps := 0.48
			var dx: float = terrain_height(px - eps, pz) - terrain_height(px + eps, pz)
			var dz: float = terrain_height(px, pz - eps) - terrain_height(px, pz + eps)
			var normal := Vector3(dx, 2.0 * eps, dz).normalized()
			normals[i] = normal
			colors[i] = _terrain_color(px, pz, py, normal)
			uv[i] = Vector2(px * 0.1, pz * 0.1)
	var indices := PackedInt32Array()
	indices.resize(resolution * resolution * 6)
	var cursor := 0
	for z in range(resolution):
		for x in range(resolution):
			var a: int = z * side + x
			var b: int = a + 1
			var c: int = a + side
			var d: int = c + 1
			for vertex_index in [a, b, c, b, d, c]:
				indices[cursor] = vertex_index
				cursor += 1
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_COLOR] = colors
	arrays[Mesh.ARRAY_TEX_UV] = uv
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	if not for_collision:
		mesh.surface_set_material(0, grass_material)
	return mesh

func _build_terrain() -> void:
	var t: Dictionary = design["terrain"]
	var extent: float = float(t["extent"])
	var visible := MeshInstance3D.new()
	visible.name = "OriginalTerrain"
	visible.mesh = _terrain_mesh(int(t["resolution"]), extent)
	add_child(visible)
	var collision_mesh := _terrain_mesh(64, extent, true)
	var collision_shape := ConcavePolygonShape3D.new()
	var arrays: Array = collision_mesh.surface_get_arrays(0)
	var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
	var faces := PackedVector3Array()
	faces.resize(indices.size())
	for i in range(indices.size()):
		faces[i] = vertices[indices[i]]
	collision_shape.set_faces(faces)
	var body := StaticBody3D.new()
	body.name = "TerrainCollider"
	var collision := CollisionShape3D.new()
	collision.name = "CollisionShape3D"
	collision.shape = collision_shape
	body.add_child(collision)
	add_child(body)

func _build_distant_ridges() -> void:
	var extent: float = float(design["terrain"]["extent"])
	var inner_radius: float = extent * 0.66
	var middle_radius: float = extent * 0.98
	var outer_radius: float = extent * 1.25
	var tool := SurfaceTool.new()
	tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for segment in range(256):
		var a: float = TAU * float(segment) / 256.0
		var b: float = TAU * float(segment + 1) / 256.0
		var p0 := Vector3(cos(a) * inner_radius, -11.0, sin(a) * inner_radius)
		var p1 := Vector3(cos(b) * inner_radius, -11.0, sin(b) * inner_radius)
		var ma: float = 12.0 + 17.0 * absf(terrain_noise.get_noise_2d(cos(a) * middle_radius, sin(a) * middle_radius))
		var mb: float = 12.0 + 17.0 * absf(terrain_noise.get_noise_2d(cos(b) * middle_radius, sin(b) * middle_radius))
		var p2 := Vector3(cos(a) * middle_radius, ma, sin(a) * middle_radius)
		var p3 := Vector3(cos(b) * middle_radius, mb, sin(b) * middle_radius)
		var p4 := Vector3(cos(a) * outer_radius, -18.0, sin(a) * outer_radius)
		var p5 := Vector3(cos(b) * outer_radius, -18.0, sin(b) * outer_radius)
		for point in [p0, p2, p1, p1, p2, p3, p2, p4, p3, p3, p4, p5]:
			tool.set_color(Color("778690"))
			tool.add_vertex(point)
	tool.generate_normals()
	_mesh_instance("DistantGeneratedRidges", tool.commit(), Vector3.ZERO, grass_material)

func _build_river() -> void:
	var extent: float = float(design["terrain"]["extent"])
	var width: float = float(design["terrain"]["riverWidth"])
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	for i in range(161):
		var z: float = (float(i) / 160.0 - 0.5) * extent
		var x: float = _river_x(z)
		var y := -0.38
		vertices.append(Vector3(x - width * 0.61, y, z))
		vertices.append(Vector3(x + width * 0.61, y, z))
		normals.append(Vector3.UP)
		normals.append(Vector3.UP)
		if i < 160:
			var a: int = i * 2
			indices.append_array(PackedInt32Array([a, a + 2, a + 1, a + 1, a + 2, a + 3]))
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(0, river_material)
	var surface := MeshInstance3D.new()
	surface.name = "OriginalRiver"
	surface.mesh = mesh
	add_child(surface)

func _mesh_instance(name: String, mesh: Mesh, location: Vector3, material: Material = null) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.name = name
	instance.mesh = mesh
	instance.position = location
	if material != null:
		instance.material_override = material
	add_child(instance)
	return instance

func _revolved(profile: Array, segments: int, color: Color = Color.WHITE) -> ArrayMesh:
	var tool := SurfaceTool.new()
	tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for layer in range(profile.size() - 1):
		var lower: Vector2 = profile[layer]
		var upper: Vector2 = profile[layer + 1]
		for segment in range(segments):
			var a: float = TAU * float(segment) / float(segments)
			var b: float = TAU * float(segment + 1) / float(segments)
			var p0 := Vector3(cos(a) * lower.x, lower.y, sin(a) * lower.x)
			var p1 := Vector3(cos(b) * lower.x, lower.y, sin(b) * lower.x)
			var p2 := Vector3(cos(a) * upper.x, upper.y, sin(a) * upper.x)
			var p3 := Vector3(cos(b) * upper.x, upper.y, sin(b) * upper.x)
			for point in [p0, p2, p1, p1, p2, p3]:
				tool.set_color(color)
				tool.add_vertex(point)
	tool.generate_normals()
	return tool.commit()

func _append_box(tool: SurfaceTool, center: Vector3, span: Vector3, tint: Color = Color.WHITE) -> void:
	var h: Vector3 = span * 0.5
	var v := [center + Vector3(-h.x, -h.y, -h.z), center + Vector3(h.x, -h.y, -h.z),
		center + Vector3(h.x, h.y, -h.z), center + Vector3(-h.x, h.y, -h.z),
		center + Vector3(-h.x, -h.y, h.z), center + Vector3(h.x, -h.y, h.z),
		center + Vector3(h.x, h.y, h.z), center + Vector3(-h.x, h.y, h.z)]
	for face in [[0, 2, 1, 0, 3, 2], [4, 5, 6, 4, 6, 7], [0, 4, 7, 0, 7, 3],
		[1, 2, 6, 1, 6, 5], [0, 1, 5, 0, 5, 4], [3, 7, 6, 3, 6, 2]]:
		for vertex_index in face:
			tool.set_color(tint)
			tool.add_vertex(v[vertex_index])

func _boxes_mesh(boxes: Array) -> ArrayMesh:
	var tool := SurfaceTool.new()
	tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for item in boxes:
		_append_box(tool, item[0], item[1], item[2])
	tool.generate_normals()
	return tool.commit()

func _tower(position: Vector3, height: float, width: float, ordinal: int) -> void:
	var profile := [Vector2(width * 1.15, 0.0), Vector2(width * 1.12, 0.7),
		Vector2(width, 1.1), Vector2(width * 0.94, height * 0.53),
		Vector2(width * 1.14, height * 0.54), Vector2(width * 1.15, height * 0.61),
		Vector2(width * 0.87, height * 0.63), Vector2(width * 0.76, height * 0.86),
		Vector2(width * 0.94, height * 0.88), Vector2(width * 0.92, height * 0.91),
		Vector2(0.07, height * 1.21)]
	_mesh_instance("Tower_%02d" % ordinal, _revolved(profile, 16), position, stone)
	var details := []
	for level in [0.22, 0.44, 0.71]:
		for side in range(8):
			var angle: float = TAU * float(side) / 8.0
			var radius: float = width * (0.96 if level < 0.5 else 0.83)
			var center := Vector3(cos(angle) * radius, height * level, sin(angle) * radius)
			details.append([center, Vector3(0.24, 2.5 if level < 0.5 else 1.5, 0.24), Color("c9c1ad")])
	for side in range(16):
		var angle: float = TAU * float(side) / 16.0
		var merlon := Vector3(cos(angle) * width * 0.91, height * 0.91 + 0.48, sin(angle) * width * 0.91)
		details.append([merlon, Vector3(0.48, 0.85, 0.48), Color("ddd0b9")])
	_mesh_instance("TowerMasonry_%02d" % ordinal, _boxes_mesh(details), position, stone)
	var windows := []
	for level in [0.31, 0.71]:
		for side in range(8):
			var angle: float = TAU * (float(side) + 0.5) / 8.0
			var radius: float = width * (0.98 if level < 0.5 else 0.83)
			var opening := Vector3(cos(angle) * radius, height * level, sin(angle) * radius)
			windows.append([opening, Vector3(0.34, 1.14, 0.34), Color.WHITE])
	_mesh_instance("TowerWindows_%02d" % ordinal, _boxes_mesh(windows), position, glass)
	var beacon := OmniLight3D.new()
	beacon.position = position + Vector3(0, height * 1.1, 0)
	beacon.light_color = Color("ffc886")
	beacon.light_energy = 0.6
	beacon.omni_range = 9.0
	add_child(beacon)

func _wall(a: Vector3, b: Vector3, height: float, index: int) -> void:
	var delta := b - a
	var length: float = delta.length()
	var center: Vector3 = (a + b) * 0.5
	var wall := Node3D.new()
	wall.name = "Wall_%02d" % index
	wall.position = center
	wall.rotation.y = atan2(-delta.z, delta.x)
	add_child(wall)
	var masonry := []
	masonry.append([Vector3(0, height * 0.5, 0), Vector3(length, height, 1.34), Color.WHITE])
	var rows := 15
	var columns: int = maxi(7, int(length / 1.15))
	for row in range(rows):
		for column in range(columns):
			var offset: float = 0.5 if row % 2 == 1 else 0.0
			var x: float = (-0.5 + (float(column) + 0.5 + offset) / float(columns)) * length
			if absf(x) > length * 0.47:
				continue
			var y: float = (float(row) + 0.5) / float(rows) * height
			var variation: float = 0.91 + 0.13 * absf(detail_noise.get_noise_2d(x + index * 19.0, y))
			for side in [-1.0, 1.0]:
				masonry.append([Vector3(x, y, side * 0.71),
					Vector3(length / float(columns) * 0.94, height / float(rows) * 0.91, 0.09),
					Color(variation, variation, variation)])
	for column in range(columns):
		if column % 2 == 0:
			var x: float = (-0.5 + (float(column) + 0.5) / float(columns)) * length
			masonry.append([Vector3(x, height + 0.44, 0), Vector3(length / float(columns) * 0.78, 0.88, 1.44), Color("aaa99f")])
	var mesh_node := MeshInstance3D.new()
	mesh_node.mesh = _boxes_mesh(masonry)
	mesh_node.material_override = stone
	wall.add_child(mesh_node)
	var trim_node := MeshInstance3D.new()
	trim_node.mesh = _boxes_mesh([[Vector3(0, height * 0.57, 0), Vector3(length, 0.28, 1.46), Color.WHITE],
		[Vector3(0, height + 0.08, 0), Vector3(length, 0.24, 1.5), Color.WHITE]])
	trim_node.material_override = trim
	wall.add_child(trim_node)

func _gate(a: Vector3, b: Vector3, height: float, index: int) -> void:
	var delta: Vector3 = b - a
	var length: float = delta.length()
	if length < 10.0:
		_wall(a, b, height, index)
		return
	var axis: Vector3 = delta.normalized()
	var center: Vector3 = (a + b) * 0.5
	_wall(a, center - axis * 3.3, height, index * 10)
	_wall(center + axis * 3.3, b, height, index * 10 + 1)
	var portal := Node3D.new()
	portal.name = "GatePortal"
	portal.position = center
	portal.rotation.y = atan2(-delta.z, delta.x)
	add_child(portal)
	var frame := []
	for side in [-1.0, 1.0]:
		frame.append([Vector3(side * 3.14, 3.0, 0), Vector3(0.82, 6.0, 1.5), Color.WHITE])
	for segment in range(13):
		var angle: float = PI * float(segment) / 12.0
		var x: float = cos(angle) * 3.1
		var y: float = 6.0 + sin(angle) * 2.0
		frame.append([Vector3(x, y, 0), Vector3(0.72, 0.65, 1.6), Color("dfd4bc")])
	frame.append([Vector3(0, height * 0.83, 0), Vector3(6.7, maxf(1.4, height * 0.34), 1.48), Color.WHITE])
	var stone_mesh := MeshInstance3D.new()
	stone_mesh.name = "GeneratedGateArch"
	stone_mesh.mesh = _boxes_mesh(frame)
	stone_mesh.material_override = trim
	portal.add_child(stone_mesh)
	var doors := MeshInstance3D.new()
	doors.name = "GeneratedGateDoors"
	doors.mesh = _boxes_mesh([[Vector3(0, 2.9, 0), Vector3(5.2, 5.8, 0.42), Color.WHITE],
		[Vector3(-1.25, 2.9, 0.3), Vector3(0.12, 5.5, 0.12), Color.WHITE],
		[Vector3(1.25, 2.9, 0.3), Vector3(0.12, 5.5, 0.12), Color.WHITE]])
	doors.material_override = dark_stone
	portal.add_child(doors)

func _build_citadel() -> void:
	var c: Dictionary = design["citadel"]
	var center := Vector3(float(c["center"][0]), 4.5, float(c["center"][1]))
	var radius: float = float(c["radius"])
	var height: float = float(c["towerHeight"])
	_mesh_instance("Foundation", _revolved([Vector2(radius + 4.5, -2.4), Vector2(radius + 4.5, -0.4),
		Vector2(radius + 3.3, 0.0), Vector2(radius + 2.0, 0.45), Vector2(0.1, 0.46)], 64), center, dark_stone)
	var count: int = int(c["towerCount"])
	var tower_points := []
	for i in range(count):
		var angle: float = TAU * (float(i) + 0.5) / float(count)
		var point := center + Vector3(cos(angle) * radius, 0, sin(angle) * radius)
		tower_points.append(point)
		_tower(point, height * (0.82 + 0.07 * float(i % 3)), 2.15, i)
	var front_index := 0
	var front_z := -INF
	for i in range(count):
		var midpoint_z: float = (tower_points[i].z + tower_points[(i + 1) % count].z) * 0.5
		if midpoint_z > front_z:
			front_z = midpoint_z
			front_index = i
	for i in range(count):
		if i == front_index:
			_gate(tower_points[i], tower_points[(i + 1) % count], height * 0.39, i)
		else:
			_wall(tower_points[i], tower_points[(i + 1) % count], height * 0.39, i)
	var keep_profile := [Vector2(5.6, 0.5), Vector2(5.7, 2.0), Vector2(5.2, 2.4),
		Vector2(4.7, height * 0.5), Vector2(5.4, height * 0.51), Vector2(5.2, height * 0.56),
		Vector2(4.2, height * 0.58), Vector2(3.8, height * 0.98), Vector2(4.6, height * 1.01),
		Vector2(4.4, height * 1.08), Vector2(2.8, height * 1.1), Vector2(1.6, height * 1.51),
		Vector2(0.1, height * 1.77)]
	_mesh_instance("CentralKeep", _revolved(keep_profile, 24), center, stone)
	var keep_details := []
	var keep_windows := []
	for tier in [0.38, 0.72, 1.19]:
		for side in range(16):
			var angle: float = TAU * float(side) / 16.0
			var r: float = 5.1 if tier < 0.5 else (4.0 if tier < 1.0 else 2.5)
			keep_details.append([Vector3(cos(angle) * r, height * tier, sin(angle) * r),
				Vector3(0.3, 3.6 if tier < 1.0 else 1.7, 0.3), Color("e5d8bd")])
			if side % 2 == 0:
				keep_windows.append([Vector3(cos(angle) * (r + 0.08), height * tier + 0.7, sin(angle) * (r + 0.08)),
					Vector3(0.43, 1.7, 0.43), Color.WHITE])
	_mesh_instance("KeepButtresses", _boxes_mesh(keep_details), center, trim)
	_mesh_instance("KeepWindows", _boxes_mesh(keep_windows), center, glass)
	var cap := OmniLight3D.new()
	cap.position = center + Vector3(0, height * 1.6, 0)
	cap.light_color = Color("ffd3a1")
	cap.light_energy = 1.4
	cap.omni_range = 17.0
	add_child(cap)

func _build_approach() -> void:
	var c: Dictionary = design["citadel"]
	var center_z: float = float(c["center"][1])
	var extent: float = float(design["terrain"]["extent"])
	var start_z: float = center_z + float(c["radius"]) + 3.0
	var end_z: float = extent * 0.44
	var tool := SurfaceTool.new()
	tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	for segment in range(90):
		var z0: float = lerpf(start_z, end_z, float(segment) / 90.0)
		var z1: float = lerpf(start_z, end_z, float(segment + 1) / 90.0)
		var x0: float = -2.7 + sin(z0 * 0.047) * 1.5
		var x1: float = -2.7 + sin(z1 * 0.047) * 1.5
		var a := Vector3(x0 - 2.5, terrain_height(x0 - 2.5, z0) + 0.18, z0)
		var b := Vector3(x0 + 2.5, terrain_height(x0 + 2.5, z0) + 0.18, z0)
		var d := Vector3(x1 - 2.5, terrain_height(x1 - 2.5, z1) + 0.18, z1)
		var e := Vector3(x1 + 2.5, terrain_height(x1 + 2.5, z1) + 0.18, z1)
		for point in [a, d, b, b, d, e]:
			tool.set_color(Color.WHITE)
			tool.add_vertex(point)
	tool.generate_normals()
	_mesh_instance("OriginalApproach", tool.commit(), Vector3.ZERO, dark_stone)
	var lanterns := []
	for i in range(15):
		var z: float = lerpf(start_z + 4.0, end_z - 2.0, float(i) / 14.0)
		var x: float = -2.7 + sin(z * 0.047) * 1.5
		for side in [-1.0, 1.0]:
			var px: float = x + side * 3.1
			var y: float = terrain_height(px, z)
			lanterns.append([Vector3(px, y + 1.0, z), Vector3(0.28, 2.0, 0.28), Color.WHITE])
			lanterns.append([Vector3(px, y + 2.1, z), Vector3(0.48, 0.22, 0.48), Color.WHITE])
	_mesh_instance("PathLanterns", _boxes_mesh(lanterns), Vector3.ZERO, trim)

func _build_vegetation() -> void:
	var extent: float = float(design["terrain"]["extent"])
	var c: Dictionary = design["citadel"]
	var positions: Array[Vector3] = []
	var sizes: Array[float] = []
	var seed_value: int = int(design["seed"])
	for i in range(480):
		var nx: float = fmod(float(i * 11213 + seed_value * 13), 997.0) / 997.0
		var nz: float = fmod(float(i * 8317 + seed_value * 29), 991.0) / 991.0
		var x: float = (nx - 0.5) * extent * 0.92
		var z: float = (nz - 0.5) * extent * 0.92
		var distance: float = Vector2(x - float(c["center"][0]), z - float(c["center"][1])).length()
		if distance < float(c["radius"]) + 13.0 or absf(x - _river_x(z)) < 7.0:
			continue
		var h: float = terrain_height(x, z)
		if h > 15.0 or h < -2.5:
			continue
		positions.append(Vector3(x, h, z))
		sizes.append(0.8 + float((i * 17) % 13) * 0.052)
	if positions.is_empty():
		return
	var trunk_mesh := _revolved([Vector2(0.11, 0.0), Vector2(0.13, 1.2), Vector2(0.07, 2.2)], 8)
	trunk_mesh.surface_set_material(0, dark_stone)
	var foliage_mesh := _revolved([Vector2(0.02, 0.0), Vector2(0.76, 0.55), Vector2(0.42, 1.12),
		Vector2(0.85, 1.14), Vector2(0.36, 1.95), Vector2(0.57, 1.98), Vector2(0.01, 2.8)], 10)
	foliage_mesh.surface_set_material(0, _stone_shader(Color("416c55"), 0.31))
	var trunk_multi := MultiMesh.new()
	trunk_multi.transform_format = MultiMesh.TRANSFORM_3D
	trunk_multi.mesh = trunk_mesh
	trunk_multi.instance_count = positions.size()
	var foliage_multi := MultiMesh.new()
	foliage_multi.transform_format = MultiMesh.TRANSFORM_3D
	foliage_multi.mesh = foliage_mesh
	foliage_multi.instance_count = positions.size()
	for i in range(positions.size()):
		var transform := Transform3D(Basis().scaled(Vector3.ONE * sizes[i]), positions[i])
		trunk_multi.set_instance_transform(i, transform)
		var crown := transform
		crown.origin.y += 0.7 * sizes[i]
		foliage_multi.set_instance_transform(i, crown)
	var trunks := MultiMeshInstance3D.new()
	trunks.name = "OriginalTreeTrunks"
	trunks.multimesh = trunk_multi
	add_child(trunks)
	var foliage := MultiMeshInstance3D.new()
	foliage.name = "OriginalTreeCanopies"
	foliage.multimesh = foliage_multi
	add_child(foliage)
