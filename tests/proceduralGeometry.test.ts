import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compileGameProject, designGame, validateGameSpec } from "../src/core/gameProject.js";
import { inspectSelfContainedGlb } from "../src/core/gameAssets.js";
import { inspectPngEvidence } from "../src/core/renderEvidence.js";
import { generateGeometry, validateGeometryRecipe } from "../src/core/proceduralGeometry.js";

const sculpture = {
    id: "original_reactor", resolution: 52, color: "#bfa484", metallic: 0.72, roughness: 0.28,
    root: { kind: "union", left: { kind: "torus", majorRadius: 0.72, minorRadius: 0.09 },
        right: { kind: "union", left: { kind: "subtract",
            left: { kind: "cylinder", radius: 0.25, halfHeight: 0.77 },
            right: { kind: "cylinder", radius: 0.13, halfHeight: 0.9 } },
        right: { kind: "radialArray", count: 8, radius: 0.59,
            child: { kind: "box", halfSize: [0.06, 0.46, 0.09], roundness: 0.025 } } } },
};

const game = {
    version: 1, title: "Original Geometry Proof",
    world: { skyColor: "#24334c", groundColor: "#414c55", gravity: 9.8 },
    player: { spawn: [0, 2, 4], speed: 6, jumpVelocity: 6 },
    props: [{ id: "reactor", shape: "box", body: "static", position: [0, 1.1, -4],
        size: [2.2, 2.2, 2.2], color: "#bfa484", visualAsset: "original_reactor" }],
    generatedGeometry: [sculpture],
    goals: [{ id: "goal", position: [3, 1, -4] }],
};

test("original bounded design becomes a deterministic, nontrivial watertight-domain GLB without source assets", () => {
    const mesh = generateGeometry(sculpture);
    assert.ok(mesh.triangles > 1_000, `Expected substantive geometry, got ${mesh.triangles} triangles`);
    assert.equal(mesh.vertices, mesh.triangles * 3);
    assert.deepEqual(inspectSelfContainedGlb(mesh.data), { meshes: 1, materials: 1 });
    assert.equal(mesh.sha256, generateGeometry(sculpture).sha256, "Same recipe must generate identical geometry");
    assert.ok(mesh.bounds.min.every(v => v > -1.1));
    assert.ok(mesh.bounds.max.every(v => v < 1.1));
    const jsonLength = mesh.data.readUInt32LE(12);
    const gltf = JSON.parse(mesh.data.toString("utf8", 20, 20 + jsonLength));
    assert.equal(gltf.accessors[0].count, mesh.vertices);
    assert.equal(gltf.accessors[1].count, mesh.vertices);
    assert.equal(gltf.meshes[0].primitives[0].mode, 4);
    assert.equal(gltf.buffers[0].uri, undefined, "Generated geometry must be self-contained");
    const vertexOffset = 20 + jsonLength + 8;
    const edges = new Map<string, number>();
    const point = (index: number): string => [0, 1, 2]
        .map(axis => Math.round(mesh.data.readFloatLE(vertexOffset + (index * 3 + axis) * 4) * 100_000)).join(",");
    for (let i = 0; i < mesh.vertices; i += 3) {
        const triangle = [point(i), point(i + 1), point(i + 2)];
        assert.equal(new Set(triangle).size, 3, "Degenerate triangle in extracted mesh");
        for (let side = 0; side < 3; side++) {
            const key = [triangle[side], triangle[(side + 1) % 3]].sort().join("|");
            edges.set(key, (edges.get(key) ?? 0) + 1);
        }
    }
    assert.ok(edges.size > 1_000);
    assert.equal([...edges.values()].filter(count => count !== 2).length, 0, "Mesh has an open or non-manifold edge");
});

test("untrusted geometry fails closed on excessive work, malformed data, escapes and empty surfaces", () => {
    assert.throws(() => validateGeometryRecipe({ ...sculpture, id: "../outside" }), /safe/u);
    assert.throws(() => validateGeometryRecipe({ ...sculpture, resolution: 2048 }), /resolution/u);
    assert.throws(() => validateGeometryRecipe({ ...sculpture, root: { kind: "script", code: "OS.execute()" } }), /Unsupported/u);
    assert.throws(() => validateGeometryRecipe({ ...sculpture, root: { kind: "radialArray", count: 24, radius: 0.5,
        child: { kind: "radialArray", count: 24, radius: 0.2, child: { kind: "sphere", radius: 0.1 } } } }), /budget/u);
    assert.throws(() => generateGeometry({ ...sculpture, root: { kind: "translate", offset: [0.95, 0, 0],
        child: { kind: "sphere", radius: 0.7 } } }), /exits/u);
    assert.throws(() => generateGeometry({ ...sculpture, root: { kind: "subtract", left: { kind: "sphere", radius: 0.2 },
        right: { kind: "sphere", radius: 0.4 } } }), /no visible surface/u);
    assert.throws(() => validateGameSpec({ ...game, generatedGeometry: [sculpture, sculpture] }), /unique/u);
});

test("game compiler embeds original generated mesh with recipe and content provenance", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "nyx-original-geometry-"));
    try {
        const project = compileGameProject(game, path.join(root, "project"));
        const asset = fs.readFileSync(path.join(project, "assets", "original_reactor.glb"));
        const manifest = JSON.parse(fs.readFileSync(path.join(project, "asset-manifest.json"), "utf8"));
        assert.equal(inspectSelfContainedGlb(asset).materials, 1);
        assert.equal(manifest.assets[0].origin, "generated");
        assert.match(manifest.assets[0].recipeSha256, /^[0-9a-f]{64}$/u);
        assert.ok(manifest.assets[0].triangles > 1_000);
        assert.equal(JSON.stringify(manifest).includes(root), false);
        assert.throws(() => compileGameProject(game, path.join(root, "collision"), { version: 1, assets: [{
            id: "original_reactor", file: path.join(root, "unused.glb"), sha256: "a".repeat(64), source: "imported",
            license: "CC0-1.0",
        }] }), /collision/u);
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});

test("NYX model protocol can request original geometry without any imported-asset catalog", async () => {
    const designed = await designGame("Create an original radial reactor sculpture and a collectible goal", {
        async generate(instruction, maxTokens) {
            assert.match(instruction, /original geometry/u);
            assert.match(instruction, /radialArray/u);
            assert.equal(maxTokens, 8192);
            return JSON.stringify(game);
        },
    });
    assert.equal(designed.generatedGeometry?.[0].id, "original_reactor");
    assert.equal(designed.props[0].visualAsset, "original_reactor");
});

const godot = process.env.GODOT_BIN;
test("Godot imports and instantiates NYX-created geometry with a separate bounded collider", {
    skip: !godot || !fs.existsSync(godot) ? "Set GODOT_BIN to Godot 4" : false,
}, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "nyx-original-godot-"));
    try {
        const integrationGame = { ...game,
            props: [{ ...game.props[0], id: "crate_a", body: "dynamic", mass: 2,
                position: [0, 3, -4], visualAsset: "sculpture" }],
            generatedGeometry: [{ ...sculpture, id: "sculpture" }] };
        const project = compileGameProject(integrationGame, path.join(root, "project"));
        const imported = execFileSync(godot!, ["--headless", "--path", project, "--import"], {
            encoding: "utf8", timeout: 120_000, shell: false,
        });
        assert.doesNotMatch(imported, /ERROR:|SCRIPT ERROR:/u);
        const here = path.dirname(fileURLToPath(import.meta.url));
        const probe = execFileSync(godot!, ["--headless", "--path", project, "--script", path.join(here, "fixtures", "asset_probe.gd")], {
            encoding: "utf8", timeout: 60_000, shell: false,
        });
        assert.match(probe, /RUFLO_ASSET_VERIFIED imported_mesh=true independent_collider=true/u);
        if (process.env.RUFLO_RENDER_TEST === "1") {
            const rendered = execFileSync(godot!, ["--path", project, "--rendering-method", "gl_compatibility",
                "--write-movie", path.join(root, "preview.png"), "--fixed-fps", "30", "--quit-after", "30"], {
                encoding: "utf8", timeout: 120_000, shell: false,
            });
            assert.match(rendered, /Done recording movie/u);
            const frame = path.join(root, "preview00000029.png");
            assert.equal(inspectPngEvidence(frame).valid, true);
            if (process.env.RUFLO_GENERATED_PREVIEW_PATH) {
                fs.copyFileSync(frame, path.resolve(process.env.RUFLO_GENERATED_PREVIEW_PATH));
            }
        }
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});
