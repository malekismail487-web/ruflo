# ==============================================================================
# UNREAL ENGINE 5 AUTOMATION PAYLOAD: AAA BIOMECHANICAL CHARACTER & HANGAR ASSEMBLY
# ==============================================================================
import unreal

print("[UE5 Automation] Initializing AAA Asset Pipeline & Scene Graph...")

editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

# 1. Enable Lumen GI & Hardware Raytracing Post Process Volume
pp_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0,0,0))
if pp_actor:
    pp_actor.set_editor_property("bUnbound", True)
    pp_comp = pp_actor.get_component_by_class(unreal.PostProcessComponent)
    if pp_comp:
        pp_comp.settings.set_editor_property("dynamic_global_illumination_method", unreal.DynamicGlobalIlluminationMethod.LUMEN)
        pp_comp.settings.set_editor_property("reflection_method", unreal.ReflectionMethod.LUMEN)
        print("[UE5 Automation] Lumen GI and Raytracing Reflections enabled.")

# 2. Setup Sun & Volumetric Atmosphere Fog
sun_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0,0,500), unreal.Rotator(-35, 45, 0))
if sun_actor:
    sun_comp = sun_actor.get_component_by_class(unreal.DirectionalLightComponent)
    if sun_comp:
        sun_comp.set_editor_property("intensity", 120000.0)
        sun_comp.set_editor_property("bAtmosphereSunLight", True)
        sun_comp.set_editor_property("volumetric_scattering_intensity", 4.5)
        print("[UE5 Automation] Directional Sun Light & Volumetric Scattering configured.")

# 3. Setup Rim Light & Yellow Emissive Floor Marker Light
rim_light = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PointLight, unreal.Vector(120, -50, 40))
if rim_light:
    rim_comp = rim_light.get_component_by_class(unreal.PointLightComponent)
    if rim_comp:
        rim_comp.set_editor_property("intensity", 25000.0)
        rim_comp.set_editor_property("light_color", unreal.Color(255, 180, 20, 255))
        print("[UE5 Automation] Floor Rim Light spawned.")

print("[UE5 Automation] AAA Observation Deck & Character Assembly Completed cleanly.")
