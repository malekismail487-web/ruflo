extends SceneTree

func _initialize() -> void:
	call_deferred("_probe")

func _probe() -> void:
	var scene: Node3D = load("res://Main.tscn").instantiate()
	root.add_child(scene)
	await physics_frame
	var body := scene.get_node("crate_a") as RigidBody3D
	if body == null:
		push_error("Physics probe could not find the dynamic body")
		quit(2)
		return
	var initial_y := body.global_position.y
	for frame in range(90):
		await physics_frame
	var final_y := body.global_position.y
	if final_y < initial_y - 1.0 and final_y > 0.4:
		print("RUFLO_PHYSICS_VERIFIED initial_y=", initial_y, " final_y=", final_y)
		root.remove_child(scene)
		scene.free()
		quit(0)
	else:
		push_error("Rigid body did not fall and settle as expected: %.3f -> %.3f" % [initial_y, final_y])
		quit(3)
