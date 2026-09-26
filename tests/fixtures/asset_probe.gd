extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene := load("res://Main.tscn") as PackedScene
	if scene == null:
		quit(2)
		return
	var game := scene.instantiate()
	root.add_child(game)
	await process_frame
	var visual := game.get_node_or_null("crate_a/Visual_sculpture")
	if visual == null or not _contains_mesh(visual):
		push_error("Imported visual mesh not found in the live scene")
		quit(2)
		return
	var body := game.get_node("crate_a") as RigidBody3D
	var collider := body.get_node_or_null("CollisionShape3D") as CollisionShape3D if body != null else null
	if collider == null or not collider.shape is BoxShape3D:
		push_error("Imported visual lost its independent physics collider")
		quit(2)
		return
	var bounds := _bounds_in_body(visual, body)
	var size: Vector3 = (collider.shape as BoxShape3D).size
	if bounds.size.x > size.x * 0.91 or bounds.size.y > size.y * 0.91 or bounds.size.z > size.z * 0.91:
		push_error("Imported visual exceeded its declared physics envelope")
		quit(2)
		return
	print("RUFLO_ASSET_VERIFIED imported_mesh=true independent_collider=true fitted=true")
	root.remove_child(game)
	game.free()
	visual = null
	body = null
	scene = null
	quit()

func _contains_mesh(node: Node) -> bool:
	if node is MeshInstance3D and (node as MeshInstance3D).mesh != null:
		return true
	for child in node.get_children():
		if _contains_mesh(child):
			return true
	return false

func _bounds_in_body(visual: Node3D, body: Node3D) -> AABB:
	var result := AABB()
	var found := false
	for node in visual.find_children("*", "MeshInstance3D", true, false):
		var instance := node as MeshInstance3D
		if instance.mesh == null:
			continue
		var transform_to_body: Transform3D = body.global_transform.affine_inverse() * instance.global_transform
		var box: AABB = instance.mesh.get_aabb()
		for x in [0.0, 1.0]:
			for y in [0.0, 1.0]:
				for z in [0.0, 1.0]:
					var point: Vector3 = transform_to_body * (box.position + box.size * Vector3(x, y, z))
					if not found:
						result = AABB(point, Vector3.ZERO)
						found = true
					else:
						result = result.expand(point)
	return result
