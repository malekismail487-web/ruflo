import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NemotronClient } from "../core/nemotronClient.js";
import { compileGameProject, designGame, validateGameSpec } from "../core/gameProject.js";
import { validateGameAssetCatalog } from "../core/gameAssets.js";

function option(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function runGodot(godot: string, args: string[], phase: string): { stdout: string; shutdownDiagnostics: boolean } {
    const result = spawnSync(path.resolve(godot), args, {
        encoding: "utf8", timeout: phase === "import" ? 120_000 : 60_000,
        shell: false, maxBuffer: 4 * 1024 * 1024,
        // Model credentials have no business in the engine process.
        env: Object.fromEntries(Object.entries(process.env).filter(([name]) => name.toUpperCase() !== "NVIDIA_API_KEY")),
    });
    if (result.error || result.status !== 0) throw new Error(`Godot ${phase} failed`);
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const diagnostics = `${stdout}\n${stderr}`.split(/\r?\n/u).filter(line => /^(?:ERROR|SCRIPT ERROR|WARNING):/u.test(line));
    const shutdownOnly = diagnostics.every(line =>
        /^ERROR: (?:\d+ RID allocations .* leaked at exit|Pages in use exist at exit|Buffer with GL ID of \d+: leaked)/u.test(line)
        || /^WARNING: (?:Leaked instance dependency|\d+ ObjectDB instances were leaked at exit)/u.test(line));
    if (diagnostics.length > 0 && (!shutdownOnly || phase === "import")) throw new Error(`Godot ${phase} reported engine errors`);
    return { stdout, shutdownDiagnostics: diagnostics.length > 0 };
}

async function main(): Promise<void> {
    const output = option("--out");
    const prompt = option("--prompt");
    const specFile = option("--spec");
    const assetFile = option("--assets");
    if (!output || Boolean(prompt) === Boolean(specFile)) {
        throw new Error("Usage: generate-game --out NEW_DIRECTORY (--prompt DESCRIPTION | --spec FILE) [--assets OPERATOR_CATALOG_JSON] [--godot GODOT_EXECUTABLE]");
    }
    const catalog = assetFile ? validateGameAssetCatalog(JSON.parse(fs.readFileSync(path.resolve(assetFile), "utf8"))) : undefined;
    const spec = specFile
        ? validateGameSpec(JSON.parse(fs.readFileSync(path.resolve(specFile), "utf8")))
        : await designGame(prompt!, new NemotronClient(), catalog);
    const project = compileGameProject(spec, output, catalog);
    process.stdout.write(`Generated Godot project: ${project}\n`);
    const godot = option("--godot");
    if (godot) {
        if (spec.props.some(prop => prop.visualAsset)) {
            runGodot(godot, ["--headless", "--path", project, "--import"], "import");
        }
        const startup = runGodot(godot, ["--headless", "--path", project, "--quit-after", "10"], "startup");
        if (!startup.stdout.includes("RUFLO_GAME_READY")) throw new Error("Godot did not confirm scene startup");
        process.stdout.write(startup.shutdownDiagnostics
            ? "Godot scene startup: observed; engine shutdown diagnostics prevent a clean verification claim\n"
            : "Godot headless startup: verified\n");
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        // Provider error bodies can contain untrusted or sensitive text.
        const message = error instanceof Error && !error.message.startsWith("Nemotron API error")
            ? error.message.split("\n")[0] : "model request or generation failed";
        process.stderr.write(`Game generation failed: ${message}\n`);
        process.exitCode = 1;
    });
}
