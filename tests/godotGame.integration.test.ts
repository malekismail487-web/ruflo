import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { compileGameProject } from "../src/core/gameProject.js";
import { inspectPngEvidence } from "../src/core/renderEvidence.js";
import { triangleGlb } from "./fixtures/triangleGlb.js";
import { inspectSelfContainedGlb } from "../src/core/gameAssets.js";

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
        const gameplay = execFileSync(godot!, ["--headless", "--path", project, "--script", path.join(here, "fixtures", "gameplay_probe.gd")], {
            encoding: "utf8", timeout: 60_000, shell: false,
        });
        const movement = gameplay.match(/RUFLO_GAMEPLAY_VERIFIED moved_m=([\d.]+) goals_remaining=0/u);
        assert.ok(movement, "Godot gameplay probe did not verify movement and goal collection");
        assert.ok(Number(movement[1]) > 0.5);
        if (process.env.RUFLO_RENDER_TEST === "1") {
            const movie = execFileSync(godot!, [
                "--path", project, "--rendering-method", "gl_compatibility", "--write-movie",
                path.join(root, "preview.png"), "--fixed-fps", "30", "--quit-after", "30",
            ], { encoding: "utf8", timeout: 120_000, shell: false });
            assert.match(movie, /Done recording movie/u);
            const first = path.join(root, "preview00000000.png");
            const last = path.join(root, "preview00000029.png");
            const firstImage = inspectPngEvidence(first);
            const lastImage = inspectPngEvidence(last);
            assert.equal(firstImage.valid, true);
            assert.equal(lastImage.valid, true);
            assert.ok((firstImage.width ?? 0) >= 640 && (firstImage.height ?? 0) >= 360);
            assert.deepEqual([firstImage.width, firstImage.height], [lastImage.width, lastImage.height]);
            assert.equal(fs.readFileSync(first).equals(fs.readFileSync(last)), false,
                "Rendered frames did not change while physics evolved");
        }
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});

test("a licensed, textured GLB can be imported and rendered without changing source code", {
    skip: !godot || !fs.existsSync(godot) || !process.env.RUFLO_REAL_GLB_PATH
        ? "Set GODOT_BIN and RUFLO_REAL_GLB_PATH for the external asset test" : false,
}, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-real-asset-"));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.match(path.basename(root), /^ruflo-real-asset-/u);
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    try {
        const file = path.resolve(process.env.RUFLO_REAL_GLB_PATH!);
        const data = fs.readFileSync(file);
        const knownHash = "a79458c4b02d695187a952f23a63b8bf278e7bc3d316a3c2a314f2d6974181f1";
        assert.equal(createHash("sha256").update(data).digest("hex"), knownHash, "Sample asset differs from reviewed Khronos file");
        assert.ok(inspectSelfContainedGlb(data).materials > 0, "Sample contains no materials");
        const here = path.dirname(fileURLToPath(import.meta.url));
        const spec = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "orbital-yard.json"), "utf8"));
        spec.props[0].visualAsset = "sculpture";
        spec.props[0].size = [2, 2, 2];
        const project = compileGameProject(spec, path.join(root, "project"), { version: 1, assets: [{
            id: "sculpture", file, sha256: knownHash,
            source: "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Lantern",
            license: "CC0-1.0",
        }] });
        const imported = execFileSync(godot!, ["--headless", "--path", project, "--import"], {
            encoding: "utf8", timeout: 120_000, shell: false,
        });
        assert.doesNotMatch(imported, /ERROR:|SCRIPT ERROR:/u);
        const probe = execFileSync(godot!, ["--headless", "--path", project, "--script", path.join(here, "fixtures", "asset_probe.gd")], {
            encoding: "utf8", timeout: 60_000, shell: false,
        });
        assert.match(probe, /RUFLO_ASSET_VERIFIED/u);
        const rendered = execFileSync(godot!, ["--path", project, "--rendering-method", "gl_compatibility",
            "--write-movie", path.join(root, "preview.png"), "--fixed-fps", "30", "--quit-after", "30"], {
            encoding: "utf8", timeout: 120_000, shell: false,
        });
        assert.match(rendered, /Done recording movie/u);
        const frame = path.join(root, "preview00000029.png");
        assert.equal(inspectPngEvidence(frame).valid, true);
        if (process.env.RUFLO_REAL_PREVIEW_PATH) fs.copyFileSync(frame, path.resolve(process.env.RUFLO_REAL_PREVIEW_PATH));
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});

test("Godot imports a hash-pinned GLB mesh and keeps the separate rigid-body collider", {
    skip: !godot || !fs.existsSync(godot) ? "Set GODOT_BIN to a Godot 4 executable" : false,
}, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-godot-asset-"));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.match(path.basename(root), /^ruflo-godot-asset-/u);
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    try {
        const here = path.dirname(fileURLToPath(import.meta.url));
        const spec = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "orbital-yard.json"), "utf8"));
        spec.props[0].visualAsset = "sculpture";
        const data = triangleGlb();
        const file = path.join(root, "sculpture.glb");
        fs.writeFileSync(file, data);
        const catalog = { version: 1, assets: [{ id: "sculpture", file,
            sha256: createHash("sha256").update(data).digest("hex"), source: "NYX deterministic fixture", license: "CC0-1.0" }] };
        const project = compileGameProject(spec, path.join(root, "project"), catalog);
        const importLog = execFileSync(godot!, ["--headless", "--path", project, "--import"], {
            encoding: "utf8", timeout: 120_000, shell: false,
        });
        assert.doesNotMatch(importLog, /ERROR:|SCRIPT ERROR:/u);
        const probe = execFileSync(godot!, ["--headless", "--path", project, "--script", path.join(here, "fixtures", "asset_probe.gd")], {
            encoding: "utf8", timeout: 60_000, shell: false,
        });
        assert.match(probe, /RUFLO_ASSET_VERIFIED imported_mesh=true independent_collider=true/u);
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});
