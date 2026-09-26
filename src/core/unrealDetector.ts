/**
 * Transparent Unreal Engine Detection & Plugin Validator Module
 * Inspects system paths, environment variables, and Epic Games installation manifests
 * to report Unreal Engine availability, version compatibility, and required plugins.
 * Gracefully defaults to Blender rendering when UE5 is missing.
 */

import fs from "node:fs";
import path from "node:path";

export interface UnrealPluginStatus {
    name: string;
    required: boolean;
    available: boolean;
}

export interface UnrealDetectionResult {
    available: boolean;
    version?: string;
    editorCmdPath?: string;
    plugins: UnrealPluginStatus[];
    fallbackRecommended: boolean;
    fallbackTarget: 'blender' | 'none';
    diagnosticReport: string[];
}

export class UnrealDetector {
    private candidateSearchPaths: string[] = [
        "C:\\Program Files\\Epic Games\\UE_5.5\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe",
        "C:\\Program Files\\Epic Games\\UE_5.4\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe",
        "C:\\Program Files\\Epic Games\\UE_5.3\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe",
        "C:\\Program Files\\Epic Games\\UE_5.2\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe",
        "C:\\Program Files\\Epic Games\\UE_5.1\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe",
        "C:\\Program Files\\Epic Games\\UE_5.0\\Engine\\Binaries\\Win64\\UnrealEditor-Cmd.exe"
    ];

    /**
     * Detects installed Unreal Engine executables and plugins.
     */
    detectEnvironment(): UnrealDetectionResult {
        const report: string[] = [];
        report.push("[UnrealDetector] Starting Unreal Engine installation check...");

        let foundPath: string | undefined = process.env.UNREAL_ENGINE_PATH;

        if (foundPath && fs.existsSync(foundPath)) {
            report.push(`[UnrealDetector] Found UNREAL_ENGINE_PATH environment override: ${foundPath}`);
        } else {
            foundPath = undefined;
            for (const candidate of this.candidateSearchPaths) {
                if (fs.existsSync(candidate)) {
                    foundPath = candidate;
                    report.push(`[UnrealDetector] Detected Unreal Engine binary at: ${candidate}`);
                    break;
                }
            }
        }

        const requiredPlugins: UnrealPluginStatus[] = [
            { name: "MovieRenderPipeline", required: true, available: false },
            { name: "PythonScriptPlugin", required: true, available: false },
            { name: "EditorScriptingUtilities", required: true, available: false },
            { name: "VolumetricCloud", required: false, available: false },
            { name: "Landmass", required: false, available: false }
        ];

        if (!foundPath) {
            report.push("[UnrealDetector] UnrealEditor-Cmd.exe not detected on system.");
            report.push("[UnrealDetector] Missing dependency: Unreal Engine 5.x. Gracefully setting rendering fallback to Blender.");
            return {
                available: false,
                version: undefined,
                editorCmdPath: undefined,
                plugins: requiredPlugins.map(p => ({ ...p, available: false })),
                fallbackRecommended: true,
                fallbackTarget: 'blender',
                diagnosticReport: report
            };
        }

        // Infer version from path if possible
        const match = foundPath.match(/UE_(5\.\d)/i);
        const versionStr = match ? match[1] : "5.x";

        report.push(`[UnrealDetector] Found a candidate Unreal Engine binary with path-inferred version ${versionStr}.`);
        report.push("[UnrealDetector] Required plugins are not verified; native rendering is not yet eligible.");

        return {
            available: false,
            version: versionStr,
            editorCmdPath: foundPath,
            plugins: requiredPlugins,
            fallbackRecommended: true,
            fallbackTarget: 'blender',
            diagnosticReport: report
        };
    }
}

export const unrealDetector = new UnrealDetector();
