extends SceneTree

func _initialize() -> void:
	call_deferred("_probe")

func _probe() -> void:
	var scene: Node3D = load("res://Main.tscn").instantiate()
	root.add_child(scene)
	await physics_frame
	var player := scene.get_node("Player") as CharacterBody3D
	if player == null:
		push_error("Missing player")
		quit(2)
		return
	var initial_z := player.global_position.z
	Input.action_press("ui_up")
	for frame in range(15):
		await physics_frame
	Input.action_release("ui_up")
	var movement_metres := initial_z - player.global_position.z
	if movement_metres <= 0.5:
		push_error("Player did not respond to movement input")
		quit(3)
		return
	player.global_position = Vector3(0, 1, -4)
	for frame in range(15):
		await physics_frame
	if scene.get_node_or_null("orb_1") != null or int(scene.get("remaining")) != 0:
		push_error("Goal collection did not complete")
		quit(4)
		return
	print("RUFLO_GAMEPLAY_VERIFIED moved_m=", movement_metres, " goals_remaining=0")
	quit(0)
