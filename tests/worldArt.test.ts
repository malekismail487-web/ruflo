import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compileGameProject, designGame, validateGameSpec } from "../src/core/gameProject.js";
import { inspectPngEvidence } from "../src/core/renderEvidence.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "citadel-world.json"), "utf8"));

test("terrain, architecture, atmosphere and camera design are bounded data", () => {
    const validated = validateGameSpec(sample);
    assert.equal(validated.worldArt?.terrain.resolution, 256);
    assert.equal(validated.worldArt?.citadel.towerCount, 8);
    assert.throws(() => validateGameSpec({ ...sample, worldArt: {
        ...sample.worldArt, terrain: { ...sample.worldArt.terrain, resolution: 2048 },
    } }), /terrain.resolution/u);
    assert.throws(() => validateGameSpec({ ...sample, worldArt: {
        ...sample.worldArt, citadel: { ...sample.worldArt.citadel, center: [60, 60] },
    } }), /fit inside/u);
    assert.throws(() => validateGameSpec({ ...sample, worldArt: {
        ...sample.worldArt, showcaseCamera: { ...sample.worldArt.showcaseCamera, target: sample.worldArt.showcaseCamera.position },
    } }), /separated/u);
});

test("strict world mode validates a bounded model response and requires a placed original mesh", async () => {
    const mesh = { id: "observatory", resolution: 36, color: "#927d69", metallic: 0.1, roughness: 0.8,
        root: { kind: "union", left: { kind: "torus", majorRadius: 0.6, minorRadius: 0.12 },
            right: { kind: "cylinder", radius: 0.18, halfHeight: 0.7 } } };
    const designed = { ...sample, worldArt: { ...sample.worldArt, seed: 93517,
        terrain: { ...sample.worldArt.terrain, ridgeStrength: 24 } },
        props: [{ id: "observatory", shape: "box", body: "static", position: [9, 6, 4],
            size: [3, 3, 3], color: "#927d69", visualAsset: "observatory" }], generatedGeometry: [mesh] };
    const result = await designGame("Design a mountain observatory with original terrain and a sculpted monument", {
        async generate(instruction, tokens) {
            assert.match(instruction, /REQUIRED: include worldArt/u);
            assert.match(instruction, /REQUIRED: author at least one original generatedGeometry/u);
            assert.equal(tokens, 8192);
            return JSON.stringify(designed);
        },
    }, undefined, { worldArt: true, originalGeometry: true });
    assert.equal(result.worldArt?.seed, 93517);
    assert.equal(result.generatedGeometry?.[0].id, "observatory");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "nyx-model-world-"));
    try {
        const project = compileGameProject(result, path.join(root, "project"));
        const manifest = JSON.parse(fs.readFileSync(path.join(project, "asset-manifest.json"), "utf8"));
        assert.equal(manifest.assets[0].origin, "generated");
        assert.equal(manifest.assets[0].id, "observatory");
        assert.ok(manifest.assets[0].triangles > 500);
        assert.ok(fs.existsSync(path.join(project, "assets", "observatory.glb")));
        assert.equal(JSON.parse(fs.readFileSync(path.join(project, "world.json"), "utf8")).worldArt.seed, 93517);
    } finally {
        fs.rmSync(root, { recursive: true });
    }
    await assert.rejects(designGame("Make terrain with a tower and original geometry", {
        async generate() { return JSON.stringify({ ...sample, worldArt: undefined }); },
    }, undefined, { worldArt: true, originalGeometry: true }), /omitted required worldArt/u);
    await assert.rejects(designGame("Make terrain with a tower and original geometry", {
        async generate() { return JSON.stringify(sample); },
    }, undefined, { worldArt: true, originalGeometry: true }), /omitted a placed original geometry/u);
});

const godot = process.env.GODOT_BIN;
test("a procedural world creates actual terrain and architecture in Godot", {
    skip: !godot || !fs.existsSync(godot) ? "Set GODOT_BIN to Godot 4" : false,
}, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "nyx-world-art-"));
    try {
        const project = compileGameProject(sample, path.join(root, "project"));
        const imported = execFileSync(godot!, ["--headless", "--path", project, "--import"], {
            encoding: "utf8", timeout: 120_000, shell: false,
        });
        assert.doesNotMatch(imported, /SCRIPT ERROR:|Parse Error:/u);
        const probe = execFileSync(godot!, ["--headless", "--path", project, "--script", path.join(here, "fixtures", "world_art_probe.gd")], {
            encoding: "utf8", timeout: 120_000, shell: false,
        });
        if (process.env.RUFLO_DEBUG_WORLD_COLORS === "1") console.log(probe.match(/NYX_TERRAIN_COLOR_SAMPLE[^\r\n]*/u)?.[0]);
        assert.match(probe, /NYX_WORLD_VERIFIED terrain_vertices=\d+ keep_vertices=\d+ tower_vertices=\d+/u);
        if (process.env.RUFLO_RENDER_TEST === "1") {
            const rendered = execFileSync(godot!, ["--path", project, "--rendering-method", process.env.RUFLO_RENDER_METHOD ?? "forward_plus",
                "--write-movie", path.join(root, "preview.png"), "--fixed-fps", "30", "--quit-after", "30"], {
                encoding: "utf8", timeout: 180_000, shell: false,
            });
            assert.match(rendered, /Done recording movie/u);
            const frame = path.join(root, "preview00000029.png");
            const inspection = inspectPngEvidence(frame);
            assert.equal(inspection.valid, true);
            assert.ok((inspection.width ?? 0) >= 1280);
            if (process.env.RUFLO_WORLD_PREVIEW_PATH) fs.copyFileSync(frame, path.resolve(process.env.RUFLO_WORLD_PREVIEW_PATH));
        }
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});
