/**
 * Open 3D Engine (O3DE) Execution Backend & Project Orchestrator
 * Integrates O3DE as a native built-in 3D engine in the Ruflo AI Swarm platform.
 * Supports AzCore entity management, Atom RHI rendering, Python scripting, and project automation.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SceneGraph } from "./sceneGraph.js";
import { O3DEAdapter } from "./rendererAdapter.js";

export interface O3DEExecutionResult {
    success: boolean;
    status: 'SCRIPT_PREPARED' | 'RENDER_VERIFIED';
    engineUsed: 'o3de';
    scriptPayload: string;
    scriptPath?: string;
    outputImagePath?: string;
    projectPath?: string;
    stdout: string;
    stderr: string;
    stats: {
        nodesProcessed: number;
        atomRenderPipelineEnabled: boolean;
        physXEnabled: boolean;
        terrainMeshEnabled: boolean;
    };
    error?: string;
}

export class O3DEEngineBackend {
    private o3deAdapter: O3DEAdapter = new O3DEAdapter();

    /**
     * Prepares an authentic O3DE project manifest (project.json)
     */
    private createProjectManifest(projectDir: string, projectName: string = "RufloSwarmO3DEProject"): string {
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        const projectJsonPath = path.join(projectDir, "project.json");
        const manifest = {
            project_name: projectName,
            product_name: projectName,
            engine: "o3de",
            origin: "https://github.com/malekismail487-web/o3de",
            display_name: `Ruflo AI Swarm - ${projectName}`,
            project_id: "{8F5F4560-A9C3-48D2-96EF-93D337320D64}",
            version: "1.0.0",
            o3de_min_version: "2409.0",
            gem_names: [
                "Atom",
                "Atom_Feature_Common",
                "Terrain",
                "PhysX",
                "EMotionFX",
                "ScriptCanvas",
                "EditorPythonBindings"
            ]
        };

        fs.writeFileSync(projectJsonPath, JSON.stringify(manifest, null, 2), "utf-8");
        return projectJsonPath;
    }

    /**
     * Prepare a script for an O3DE Editor with Python Editor Bindings enabled.
     * This repository does not yet launch that Editor or verify a rendered frame.
     * A generated script, project manifest, and successful registration check are
     * never equivalent to actual scene execution or image evidence.
     */
    async executeSceneGraph(
        sceneGraph: SceneGraph,
        outputFileName: string = "o3de_render.png"
    ): Promise<O3DEExecutionResult> {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}\.png$/u.test(outputFileName)) {
            throw new Error("outputFileName must be a simple PNG filename");
        }
        const o3deResult = this.o3deAdapter.convertSceneGraph(sceneGraph, outputFileName);
        const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-o3de-"));
        const projectDir = path.join(scratchDir, "O3DESwarmProject");
        const projectJsonPath = this.createProjectManifest(projectDir);

        const scriptPath = path.join(projectDir, "temp_o3de_scene.py");
        fs.writeFileSync(scriptPath, o3deResult.scriptPayload, "utf-8");

        return {
            success: false,
            status: 'SCRIPT_PREPARED',
            engineUsed: 'o3de',
            scriptPayload: o3deResult.scriptPayload,
            scriptPath,
            projectPath: projectJsonPath,
            stdout: "",
            stderr: "",
            stats: {
                nodesProcessed: o3deResult.metadata.totalNodesProcessed,
                atomRenderPipelineEnabled: false,
                physXEnabled: false,
                terrainMeshEnabled: false
            },
            error: "O3DE Editor execution and render verification have not occurred."
        };
    }
}

export const o3deEngineBackend = new O3DEEngineBackend();
