/**
 * Unreal Engine Execution Backend & Project Orchestrator
 * Serves as an execution backend in the Renderer Abstraction Layer.
 * Leverages UnrealAdapter, AssetPipeline, and UnrealDetector for project configuration,
 * scene construction, script generation, and Movie Render Queue execution with transparent fallback.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SceneGraph } from "./sceneGraph.js";
import { UnrealAdapter, BlenderAdapter, RenderAdapterResult } from "./rendererAdapter.js";
import { unrealDetector, UnrealDetectionResult } from "./unrealDetector.js";
import { assetPipeline } from "./assetPipeline.js";
import { blenderEngine } from "./blenderEngine.js";
import { inspectPngEvidence } from "./renderEvidence.js";

export interface EngineExecutionResult {
    success: boolean;
    engineUsed: 'unreal' | 'blender';
    scriptPayload: string;
    outputImagePath?: string;
    projectPath?: string;
    stdout: string;
    stderr: string;
    detectionInfo: UnrealDetectionResult;
    stats: {
        nodesProcessed: number;
        volumetricFogEnabled: boolean;
        lumenGIEnabled: boolean;
        naniteMeshesEnabled: boolean;
    };
    error?: string;
}

export class UnrealEngineBackend {
    private unrealAdapter: UnrealAdapter = new UnrealAdapter();
    private blenderAdapter: BlenderAdapter = new BlenderAdapter();

    /**
     * Prepares a minimal Unreal Engine .uproject manifest
     */
    createProjectManifest(projectDir: string, projectName: string = "SwarmUnrealProject"): string {
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        const uprojectPath = path.join(projectDir, `${projectName}.uproject`);
        const manifest = {
            FileVersion: 3,
            EngineAssociation: "5.5",
            Category: "SwarmEngineering",
            Description: "Autonomous Engineering Swarm Unreal Engine Project",
            Plugins: [
                { name: "MovieRenderPipeline", Enabled: true },
                { name: "PythonScriptPlugin", Enabled: true },
                { name: "EditorScriptingUtilities", Enabled: true }
            ]
        };

        fs.writeFileSync(uprojectPath, JSON.stringify(manifest, null, 2), "utf-8");
        return uprojectPath;
    }

    /**
     * Executes scene graph rendering on Unreal Engine (or gracefully falls back to Blender)
     */
    async executeSceneGraph(
        sceneGraph: SceneGraph,
        outputFileName: string = "unreal_render.png"
    ): Promise<EngineExecutionResult> {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}\.png$/u.test(outputFileName)) {
            throw new Error("outputFileName must be a simple PNG filename");
        }
        const detection = unrealDetector.detectEnvironment();
        const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-unreal-"));

        const projectDir = path.join(scratchDir, "UnrealSwarmProject");
        const uprojectPath = this.createProjectManifest(projectDir);

        if (!detection.available || detection.fallbackRecommended) {
            // Graceful fallback to Blender Adapter
            const blenderResult = this.blenderAdapter.convertSceneGraph(sceneGraph, outputFileName);
            const execResult = await blenderEngine.executeScriptAndRender(blenderResult.scriptPayload, outputFileName);

            return {
                success: execResult.success,
                engineUsed: 'blender',
                scriptPayload: blenderResult.scriptPayload,
                outputImagePath: execResult.outputImagePath,
                projectPath: undefined,
                stdout: execResult.stdout + "\n[UnrealEngineBackend] Gracefully executed via Blender Adapter due to missing UE5 environment.",
                stderr: execResult.stderr,
                detectionInfo: detection,
                stats: {
                    nodesProcessed: blenderResult.metadata.totalNodesProcessed,
                    volumetricFogEnabled: blenderResult.metadata.hasVolumetricFog,
                    lumenGIEnabled: false,
                    naniteMeshesEnabled: false
                },
                error: execResult.error
            };
        }

        // Native Unreal Engine execution path
        const unrealAdapterResult = this.unrealAdapter.convertSceneGraph(sceneGraph, outputFileName);
        const scriptPath = path.join(projectDir, "temp_unreal_scene.py");
        fs.writeFileSync(scriptPath, unrealAdapterResult.scriptPayload, "utf-8");

        try {
            const startedAtMs = Date.now();
            const stdoutBuffer = execFileSync(detection.editorCmdPath!, [
                uprojectPath, `-ExecutePythonScript=${scriptPath}`, "-unattended", "-nosplash",
            ], { encoding: "utf-8", timeout: 120000, shell: false });
            const outputPath = path.join(scratchDir, outputFileName);
            const evidence = inspectPngEvidence(outputPath, startedAtMs);

            return {
                success: evidence.valid,
                engineUsed: 'unreal',
                scriptPayload: unrealAdapterResult.scriptPayload,
                outputImagePath: evidence.valid ? outputPath : undefined,
                projectPath: uprojectPath,
                stdout: stdoutBuffer,
                stderr: "",
                detectionInfo: detection,
                stats: {
                    nodesProcessed: unrealAdapterResult.metadata.totalNodesProcessed,
                    volumetricFogEnabled: false,
                    lumenGIEnabled: false,
                    naniteMeshesEnabled: false
                },
                error: evidence.valid ? undefined : `Unreal did not produce a verified PNG: ${evidence.reason}`
            };
        } catch (err: unknown) {
            const execErr = err as { stdout?: string; stderr?: string; message?: string };
            return {
                success: false,
                engineUsed: 'unreal',
                scriptPayload: unrealAdapterResult.scriptPayload,
                projectPath: uprojectPath,
                stdout: execErr.stdout || "",
                stderr: execErr.stderr || "",
                detectionInfo: detection,
                stats: {
                    nodesProcessed: unrealAdapterResult.metadata.totalNodesProcessed,
                    volumetricFogEnabled: false,
                    lumenGIEnabled: false,
                    naniteMeshesEnabled: false
                },
                error: execErr.message || String(err)
            };
        }
    }
}

export const unrealEngineBackend = new UnrealEngineBackend();
