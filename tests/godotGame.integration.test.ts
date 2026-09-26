import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compileGameProject } from "../src/core/gameProject.js";

const godot = process.env.GODOT_BIN;

test("generated 3D game starts in Godot and a real rigid body falls onto the ground", {
    skip: !godot || !fs.existsSync(godot) ? "Set GODOT_BIN to a Godot 4 executable" : false,
}, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-godot-integration-"));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.match(path.basename(root), /^ruflo-godot-integration-/u);
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    try {
        const here = path.dirname(fileURLToPath(import.meta.url));
        const spec = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "orbital-yard.json"), "utf8"));
        const project = compileGameProject(spec, path.join(root, "project"));
        const startup = execFileSync(godot!, ["--headless", "--path", project, "--quit-after", "10"], {
            encoding: "utf8", timeout: 60_000, shell: false,
        });
        assert.match(startup, /RUFLO_GAME_READY props=2 goals=1/u);
        const probe = execFileSync(godot!, ["--headless", "--path", project, "--script", path.join(here, "fixtures", "physics_probe.gd")], {
            encoding: "utf8", timeout: 60_000, shell: false,
        });
        const match = probe.match(/RUFLO_PHYSICS_VERIFIED initial_y=([\d.]+) final_y=([\d.]+)/u);
        assert.ok(match, "Godot physics probe did not report measured rigid-body motion");
        assert.ok(Number(match[1]) > Number(match[2]) + 1, "The rigid body did not fall by at least one metre");
        assert.ok(Number(match[2]) > 0.4, "The rigid body penetrated the ground");
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});
