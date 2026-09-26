import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectPngEvidence } from "./renderEvidence.js";

export interface BlenderRenderResult {
    success: boolean;
    script: string;
    outputImagePath?: string;
    stdout: string;
    stderr: string;
    error?: string;
}

export class BlenderEngine {
    private blenderExecutable: string;

    constructor(customBlenderPath?: string) {
        this.blenderExecutable = customBlenderPath || 
            process.env.BLENDER_PATH || 
            `C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe`;
    }

    /**
     * Executes a Blender Python (bpy) script headless in the background
     * and renders the frame to a PNG image.
     */
    async executeScriptAndRender(
        bpyScript: string,
        outputFileName: string = "rendered_frame.png"
    ): Promise<BlenderRenderResult> {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}\.png$/u.test(outputFileName)) {
            throw new Error("outputFileName must be a simple PNG filename");
        }
        const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-blender-"));

        const scriptPath = path.join(scratchDir, "temp_render_script.py");
        const outputPath = path.join(scratchDir, outputFileName);

        // The final render target is chosen by this backend, not by the script.
        const formattedScript = bpyScript + `\n\nimport bpy\nbpy.context.scene.render.filepath = ${JSON.stringify(outputPath.replace(/\\/g, "/"))}\nbpy.ops.render.render(write_still=True)\n`;

        fs.writeFileSync(scriptPath, formattedScript, "utf-8");

        try {
            const startedAtMs = Date.now();
            const stdoutBuffer = execFileSync(this.blenderExecutable, ["--background", "--python", scriptPath], {
                encoding: "utf-8", timeout: 60000, shell: false,
            });
            const evidence = inspectPngEvidence(outputPath, startedAtMs);
            return {
                success: evidence.valid,
                script: formattedScript,
                outputImagePath: evidence.valid ? outputPath : undefined,
                stdout: stdoutBuffer,
                stderr: "",
                error: evidence.valid ? undefined : `Blender did not produce a verified PNG: ${evidence.reason}`
            };
        } catch (err: unknown) {
            const execError = err as { stdout?: string; stderr?: string; message?: string };
            return {
                success: false,
                script: formattedScript,
                stdout: execError.stdout || "",
                stderr: execError.stderr || "",
                error: execError.message || String(err)
            };
        }
    }
}

export const blenderEngine = new BlenderEngine();
