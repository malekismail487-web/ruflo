extends Node3D

# All scene content comes from a validated data specification. No model-authored
# GDScript, asset path, command, or URL is executed by this runtime.
var spec: Dictionary
var player: CharacterBody3D
var camera: Camera3D
var hud: Label
var remaining: int = 0

func _ready() -> void:
	var file := FileAccess.open("res://world.json", FileAccess.READ)
	if file == null:
		push_error("Missing world.json")
		get_tree().quit(2)
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		push_error("Invalid world specification")
		get_tree().quit(2)
		return
	spec = parsed
	_build_environment()
	_build_ground()
	_build_player()
	for prop in spec["props"]:
		_build_prop(prop)
	for goal in spec["goals"]:
		_build_goal(goal)
	_build_hud()
	print("RUFLO_GAME_READY props=", spec["props"].size(), " goals=", remaining)

func _v3(data: Array) -> Vector3:
	return Vector3(float(data[0]), float(data[1]), float(data[2]))

func _material(hex: String) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color.html(hex)
	mat.metallic = 0.18
	mat.roughness = 0.58
	return mat

func _build_environment() -> void:
	var env_node := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color.html(spec["world"]["skyColor"])
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.72, 0.79, 0.94)
	env.ambient_light_energy = 0.55
	env_node.environment = env
	add_child(env_node)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, 35, 0)
	sun.light_energy = 1.6
	sun.shadow_enabled = true
	add_child(sun)

func _build_ground() -> void:
	var ground := StaticBody3D.new()
	ground.name = "Ground"
	ground.position = Vector3(0, -0.5, 0)
	add_child(ground)
	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(200, 1, 200)
	mesh.mesh = box
	mesh.material_override = _material(spec["world"]["groundColor"])
	ground.add_child(mesh)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = box.size
	collision.shape = shape
	ground.add_child(collision)

func _build_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Player"
	player.position = _v3(spec["player"]["spawn"])
	add_child(player)
	var mesh := MeshInstance3D.new()
	var capsule_mesh := CapsuleMesh.new()
	capsule_mesh.radius = 0.42
	capsule_mesh.height = 1.8
	mesh.mesh = capsule_mesh
	mesh.material_override = _material("#f3c970")
	player.add_child(mesh)
	var collision := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.42
	capsule.height = 1.8
	collision.shape = capsule
	player.add_child(collision)
	camera = Camera3D.new()
	camera.name = "FollowCamera"
	camera.fov = 65.0
	camera.position = player.position + Vector3(0, 5.5, 9.5)
	add_child(camera)
	camera.look_at(player.position + Vector3(0, 1, 0))
	camera.current = true

func _build_prop(data: Dictionary) -> void:
	var body: PhysicsBody3D
	if data["body"] == "dynamic":
		var dynamic_body := RigidBody3D.new()
		dynamic_body.mass = float(data["mass"])
		body = dynamic_body
	else:
		body = StaticBody3D.new()
	body.name = data["id"]
	body.position = _v3(data["position"])
	add_child(body)
	var dimensions := _v3(data["size"])
	var display := MeshInstance3D.new()
	var collision := CollisionShape3D.new()
	match data["shape"]:
		"sphere":
			var sphere_mesh := SphereMesh.new()
			sphere_mesh.radius = dimensions.x * 0.5
			sphere_mesh.height = dimensions.x
			display.mesh = sphere_mesh
			var sphere_shape := SphereShape3D.new()
			sphere_shape.radius = dimensions.x * 0.5
			collision.shape = sphere_shape
		"cylinder":
			var cylinder_mesh := CylinderMesh.new()
			cylinder_mesh.top_radius = dimensions.x * 0.5
			cylinder_mesh.bottom_radius = dimensions.x * 0.5
			cylinder_mesh.height = dimensions.y
			display.mesh = cylinder_mesh
			var cylinder_shape := CylinderShape3D.new()
			cylinder_shape.radius = dimensions.x * 0.5
			cylinder_shape.height = dimensions.y
			collision.shape = cylinder_shape
		_:
			var box_mesh := BoxMesh.new()
			box_mesh.size = dimensions
			display.mesh = box_mesh
			var box_shape := BoxShape3D.new()
			box_shape.size = dimensions
			collision.shape = box_shape
	display.material_override = _material(data["color"])
	body.add_child(display)
	body.add_child(collision)

func _build_goal(data: Dictionary) -> void:
	var area := Area3D.new()
	area.name = data["id"]
	area.position = _v3(data["position"])
	add_child(area)
	var mesh := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.38
	sphere.height = 0.76
	mesh.mesh = sphere
	var glow := _material("#ffdb75")
	glow.emission_enabled = true
	glow.emission = Color.html("#ffcc50")
	glow.emission_energy_multiplier = 2.0
	mesh.material_override = glow
	area.add_child(mesh)
	var collision := CollisionShape3D.new()
	var sphere_shape := SphereShape3D.new()
	sphere_shape.radius = 0.5
	collision.shape = sphere_shape
	area.add_child(collision)
	area.body_entered.connect(_on_goal_entered.bind(area))
	remaining += 1

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Label.new()
	hud.position = Vector2(24, 20)
	hud.add_theme_font_size_override("font_size", 24)
	layer.add_child(hud)
	_update_hud()

func _update_hud() -> void:
	hud.text = "%s  |  Goals: %d  |  Move: arrows  Jump: Enter" % [spec["title"], remaining]

func _on_goal_entered(body: Node3D, area: Area3D) -> void:
	if body != player or area.is_queued_for_deletion():
		return
	area.queue_free()
	remaining -= 1
	_update_hud()
	if remaining == 0:
		print("RUFLO_GAME_GOALS_COMPLETE")

func _physics_process(delta: float) -> void:
	if player == null:
		return
	var input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var velocity := player.velocity
	velocity.x = input.x * float(spec["player"]["speed"])
	velocity.z = input.y * float(spec["player"]["speed"])
	if not player.is_on_floor():
		velocity.y -= float(spec["world"]["gravity"]) * delta
	elif Input.is_action_just_pressed("ui_accept"):
		velocity.y = float(spec["player"]["jumpVelocity"])
	player.velocity = velocity
	player.move_and_slide()
	camera.global_position = camera.global_position.lerp(player.global_position + Vector3(0, 5.5, 9.5), minf(1.0, delta * 5.0))
	camera.look_at(player.global_position + Vector3(0, 1, 0))
