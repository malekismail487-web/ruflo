import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NemotronClient } from "../core/nemotronClient.js";
import { compileGameProject, designGame, validateGameSpec } from "../core/gameProject.js";

function option(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
    const output = option("--out");
    const prompt = option("--prompt");
    const specFile = option("--spec");
    if (!output || Boolean(prompt) === Boolean(specFile)) {
        throw new Error("Usage: generate-game --out NEW_DIRECTORY (--prompt DESCRIPTION | --spec FILE) [--godot GODOT_EXECUTABLE]");
    }
    const spec = specFile
        ? validateGameSpec(JSON.parse(fs.readFileSync(path.resolve(specFile), "utf8")))
        : await designGame(prompt!, new NemotronClient());
    const project = compileGameProject(spec, output);
    process.stdout.write(`Generated Godot project: ${project}\n`);
    const godot = option("--godot");
    if (godot) {
        const log = execFileSync(path.resolve(godot), ["--headless", "--path", project, "--quit-after", "10"], {
            encoding: "utf8", timeout: 60_000, shell: false,
        });
        if (!log.includes("RUFLO_GAME_READY")) throw new Error("Godot did not confirm scene startup");
        process.stdout.write("Godot headless startup: verified\n");
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
