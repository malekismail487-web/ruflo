/**
 * Unreal Director Agent Module
 * Specialized swarm agent responsible for assembling engine-independent SceneGraphs,
 * dispatching the Asset Pipeline, orchestrating Unreal Engine project generation,
 * monitoring Movie Render Queue execution, and reporting render statistics back to the swarm.
 */

import { SceneGraph, SceneNode, PBRMaterial } from "./sceneGraph.js";
import { assetPipeline, AssetImportSpec } from "./assetPipeline.js";
import { unrealEngineBackend, EngineExecutionResult } from "./unrealEngine.js";
import { unifiedEventBus } from "./unifiedEventBus.js";

export interface UnrealDirectorTask {
    taskName: string;
    targetAsset: string;
    enableVolumetricFog?: boolean;
    enableLumen?: boolean;
    enableNanite?: boolean;
}

export interface DirectorExecutionReport {
    agentId: string;
    taskName: string;
    sceneGraphStats: {
        totalNodes: number;
        totalMaterials: number;
        lightsCount: number;
        camerasCount: number;
    };
    assetPipelineValidation: {
        valid: boolean;
        missingAssets: string[];
    };
    executionResult: EngineExecutionResult;
    summary: string;
}

export class UnrealDirectorAgent {
    public agentId: string = "agent-unreal-director-01";
    public role: string = "Unreal Engine Director & Scene Architect";

    /**
     * Builds a comprehensive SceneGraph from high-level swarm specifications
     */
    buildMegastationSceneGraph(task: UnrealDirectorTask): SceneGraph {
        const scene = new SceneGraph("sg-megastation-01", task.targetAsset);

        scene.environment.volumetricFog.enabled = task.enableVolumetricFog ?? true;
        scene.environment.postProcess.enableLumenGI = task.enableLumen ?? true;
        scene.environment.postProcess.enableLumenReflections = task.enableLumen ?? true;

        // Add PBR Materials
        const hullMaterial: PBRMaterial = {
            id: "mat-pressurized-hull",
            name: "Pressurized Module Plating",
            baseColor: { r: 0.85, g: 0.88, b: 0.92 },
            metallic: 0.9,
            roughness: 0.25,
            useNanite: task.enableNanite ?? true
        };

        const trussMaterial: PBRMaterial = {
            id: "mat-structural-truss",
            name: "Titanium Structural Truss",
            baseColor: { r: 0.2, g: 0.22, b: 0.25 },
            metallic: 0.95,
            roughness: 0.4,
            useNanite: task.enableNanite ?? true
        };

        scene.addMaterial(hullMaterial);
        scene.addMaterial(trussMaterial);

        // Core Hub Node
        const hubNode: SceneNode = {
            id: "node-hub-core",
            name: "Central Engineering Hub",
            transform: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 10, y: 10, z: 25 }
            },
            mesh: {
                id: "mesh-hub-cylinder",
                primitiveType: "cylinder",
                enableNanite: task.enableNanite ?? true,
                generateCollision: true
            },
            materialId: hullMaterial.id,
            childrenIds: []
        };
        scene.addNode(hubNode);

        // Solar Array Arm Left
        const solarArmLeft: SceneNode = {
            id: "node-solar-arm-l",
            name: "Articulated Solar Arm Left",
            parentId: "node-hub-core",
            transform: {
                position: { x: -30, y: 0, z: 5 },
                rotation: { x: 0, y: 45, z: 0 },
                scale: { x: 40, y: 2, z: 1 }
            },
            mesh: {
                id: "mesh-solar-truss",
                primitiveType: "box",
                enableNanite: task.enableNanite ?? true,
                generateCollision: true
            },
            materialId: trussMaterial.id,
            childrenIds: []
        };
        scene.addNode(solarArmLeft);

        // Sun & Directional Light Node
        const sunLightNode: SceneNode = {
            id: "node-sun-light",
            name: "Primary Directional SunSky",
            transform: {
                position: { x: 100, y: 200, z: 300 },
                rotation: { x: -45, y: 30, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            light: {
                type: 'directional',
                color: { r: 1.0, g: 0.95, b: 0.85 },
                intensity: 120000,
                castShadows: true,
                volumetricScatteringIntensity: 2.0
            },
            childrenIds: []
        };
        scene.addNode(sunLightNode);

        // Cinematic Camera Node
        const cameraNode: SceneNode = {
            id: "node-cine-camera",
            name: "Main Cinematic Camera",
            transform: {
                position: { x: 60, y: -80, z: 40 },
                rotation: { x: -20, y: 35, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            camera: {
                fov: 65,
                focalLength: 35,
                aperture: 2.8,
                nearClip: 0.1,
                farClip: 50000,
                isPrimary: true
            },
            childrenIds: []
        };
        scene.addNode(cameraNode);

        return scene;
    }

    /**
     * Executes the full Unreal Engine Director workflow
     */
    async executeDirectorWorkflow(task: UnrealDirectorTask): Promise<DirectorExecutionReport> {
        unifiedEventBus.publish({
            id: `evt-dir-start-${Date.now()}`,
            timestamp: new Date().toISOString(),
            senderId: this.agentId,
            topic: "UNREAL_DIRECTOR_TASK_START",
            payload: { task }
        });

        // 1. Build SceneGraph
        const sceneGraph = this.buildMegastationSceneGraph(task);

        // 2. Register and validate assets via AssetPipeline
        const meshAssetSpec: AssetImportSpec = {
            assetId: "mesh-megastation-core",
            sourcePath: "scratch/megastation_core.gltf",
            destinationFolder: "Meshes",
            assetType: "mesh",
            enableNanite: task.enableNanite ?? true,
            generateCollision: true
        };
        assetPipeline.registerAsset(meshAssetSpec);
        const pipelineValidation = assetPipeline.validateAssets();

        // 3. Dispatch to Unreal Engine Backend
        const renderResult = await unrealEngineBackend.executeSceneGraph(sceneGraph, `${task.targetAsset.toLowerCase()}_unreal.png`);

        const summary = `Unreal Director Agent completed level assembly & render execution. Engine used: ${renderResult.engineUsed}. Nodes processed: ${renderResult.stats.nodesProcessed}. Volumetric fog: ${renderResult.stats.volumetricFogEnabled}. Lumen GI: ${renderResult.stats.lumenGIEnabled}.`;

        unifiedEventBus.publish({
            id: `evt-dir-complete-${Date.now()}`,
            timestamp: new Date().toISOString(),
            senderId: this.agentId,
            topic: "UNREAL_DIRECTOR_TASK_COMPLETE",
            payload: {
                engineUsed: renderResult.engineUsed,
                success: renderResult.success,
                summary
            }
        });

        return {
            agentId: this.agentId,
            taskName: task.taskName,
            sceneGraphStats: sceneGraph.getStats(),
            assetPipelineValidation: {
                valid: pipelineValidation.valid,
                missingAssets: pipelineValidation.missingAssets
            },
            executionResult: renderResult,
            summary
        };
    }
}

export const unrealDirectorAgent = new UnrealDirectorAgent();
