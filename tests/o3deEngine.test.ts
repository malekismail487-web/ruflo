import { describe, it, expect } from "vitest";
import { SceneGraph } from "../src/core/sceneGraph.js";
import { O3DEAdapter } from "../src/core/rendererAdapter.js";
import { o3deEngineBackend } from "../src/core/o3deEngine.js";

describe("Open 3D Engine (O3DE) Built-In 3D Engine Integration", () => {
    it("should generate valid O3DE AzCore Python automation script from SceneGraph", () => {
        const scene = new SceneGraph("TestO3DEScene");
        scene.addNode({
            id: "hero_mech",
            name: "HeroMechMesh",
            transform: {
                position: { x: 0, y: 10, z: 0 },
                rotation: { x: 0, y: 45, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            mesh: {
                primitiveType: "cube",
                materialName: "Substrate_Nanite_Titanium"
            }
        });

        scene.addNode({
            id: "sun_light",
            name: "SunAtmosphereLight",
            transform: {
                position: { x: 100, y: 200, z: 100 },
                rotation: { x: -45, y: 30, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            light: {
                type: "directional",
                intensity: 10000,
                color: { r: 1, g: 0.95, b: 0.9 }
            }
        });

        const adapter = new O3DEAdapter();
        expect(adapter.getEngineName()).toBe("o3de");

        const result = adapter.convertSceneGraph(scene, "test_o3de.png");
        expect(result.engine).toBe("o3de");
        expect(result.scriptPayload).toContain("azlmbr.atom");
        expect(result.scriptPayload).toContain("HeroMechMesh");
        expect(result.scriptPayload).toContain("SunAtmosphereLight");
        expect(result.metadata.totalNodesProcessed).toBe(2);
        expect(result.metadata.hasAtomRenderer).toBe(true);
    });

    it("should assemble O3DE project manifest and execute scene graph", async () => {
        const scene = new SceneGraph("SwarmMissionLevel");
        const execResult = await o3deEngineBackend.executeSceneGraph(scene, "mission_render.png");

        expect(execResult.success).toBe(true);
        expect(execResult.engineUsed).toBe("o3de");
        expect(execResult.stats.atomRenderPipelineEnabled).toBe(true);
        expect(execResult.stats.physXEnabled).toBe(true);
        expect(execResult.stats.terrainMeshEnabled).toBe(true);
    });
});
