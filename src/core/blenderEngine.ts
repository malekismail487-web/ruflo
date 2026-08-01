import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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
        const scratchDir = path.resolve(process.cwd(), "scratch");
        if (!fs.existsSync(scratchDir)) {
            fs.mkdirSync(scratchDir, { recursive: true });
        }

        const scriptPath = path.join(scratchDir, "temp_render_script.py");
        const outputPath = path.join(scratchDir, outputFileName);

        // Ensure script specifies render filepath if not already specified
        let formattedScript = bpyScript;
        if (!formattedScript.includes("render.filepath")) {
            const escapedOutputPath = outputPath.replace(/\\/g, "/");
            formattedScript += `\n\nimport bpy\nbpy.context.scene.render.filepath = "${escapedOutputPath}"\nbpy.ops.render.render(write_still=True)\n`;
        }

        fs.writeFileSync(scriptPath, formattedScript, "utf-8");

        const command = `"${this.blenderExecutable}" --background --python "${scriptPath}"`;

        try {
            const stdoutBuffer = execSync(command, { encoding: "utf-8", timeout: 60000 });
            
            const imageExists = fs.existsSync(outputPath);
            return {
                success: imageExists,
                script: formattedScript,
                outputImagePath: imageExists ? outputPath : undefined,
                stdout: stdoutBuffer,
                stderr: "",
                error: imageExists ? undefined : "Blender executed but render output image was not found."
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
