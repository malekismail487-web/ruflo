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
	var art := game.get_node_or_null("WorldArt") as Node3D
	if art == null:
		push_error("No procedural world art instantiated")
		quit(2)
		return
	var terrain := art.get_node_or_null("OriginalTerrain") as MeshInstance3D
	var keep := art.get_node_or_null("CentralKeep") as MeshInstance3D
	var tower := art.get_node_or_null("Tower_00") as MeshInstance3D
	var river := art.get_node_or_null("OriginalRiver") as MeshInstance3D
	var collider := art.get_node_or_null("TerrainCollider/CollisionShape3D") as CollisionShape3D
	if terrain == null or keep == null or tower == null or river == null or collider == null:
		push_error("Procedural world missing nodes terrain=%s keep=%s tower=%s river=%s collider=%s" % [
			terrain != null, keep != null, tower != null, river != null, collider != null])
		quit(2)
		return
	var terrain_vertices: int = terrain.mesh.surface_get_array_len(0)
	var terrain_arrays: Array = terrain.mesh.surface_get_arrays(0)
	var terrain_points: PackedVector3Array = terrain_arrays[Mesh.ARRAY_VERTEX]
	var terrain_indices: PackedInt32Array = terrain_arrays[Mesh.ARRAY_INDEX]
	var first_face: Vector3 = (terrain_points[terrain_indices[1]] - terrain_points[terrain_indices[0]]).cross(
		terrain_points[terrain_indices[2]] - terrain_points[terrain_indices[0]])
	if first_face.y >= -0.01:
		push_error("Terrain triangle winding would hide the landscape from the showcase camera")
		quit(2)
		return
	var keep_vertices: int = keep.mesh.surface_get_array_len(0)
	var tower_vertices: int = tower.mesh.surface_get_array_len(0)
	var architecture_vertices := 0
	for item in art.find_children("*", "MeshInstance3D", true, false):
		var instance := item as MeshInstance3D
		if instance == terrain or instance == river or instance.mesh == null:
			continue
		for surface in range(instance.mesh.get_surface_count()):
			architecture_vertices += instance.mesh.surface_get_array_len(surface)
	if terrain_vertices < 30000 or keep_vertices < 1000 or tower_vertices < 500 or architecture_vertices < 30000:
		push_error("Generated world geometry below structural floor terrain=%d keep=%d tower=%d architecture=%d" % [
			terrain_vertices, keep_vertices, tower_vertices, architecture_vertices])
		quit(2)
		return
	if not collider.shape is ConcavePolygonShape3D:
		push_error("Terrain lacks an independent collision mesh")
		quit(2)
		return
	print("NYX_WORLD_VERIFIED terrain_vertices=", terrain_vertices, " keep_vertices=", keep_vertices,
		" tower_vertices=", tower_vertices, " architecture_vertices=", architecture_vertices)
	root.remove_child(game)
	game.free()
	quit()
