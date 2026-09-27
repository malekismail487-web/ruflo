import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { compileGameProject, designGame, parseModelGameSpec, validateGameSpec } from "../src/core/gameProject.js";
import { inspectSelfContainedGlb, validateGameAssetCatalog } from "../src/core/gameAssets.js";
import { triangleGlb } from "./fixtures/triangleGlb.js";

const sample = {
    version: 1,
    title: "Orbital Yard",
    world: { skyColor: "#253656", groundColor: "#596a71", gravity: 9.8 },
    player: { spawn: [0, 2, 4], speed: 6, jumpVelocity: 6 },
    props: [
        { id: "crate_a", shape: "box", body: "dynamic", position: [2, 4, 0], size: [1, 1, 1], color: "#c98552", mass: 2 },
        { id: "column", shape: "cylinder", body: "static", position: [-3, 1, -2], size: [1, 2, 1], color: "#a7b5cc" },
    ],
    goals: [{ id: "orb_1", position: [0, 1, -4] }],
};

function tempRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-game-test-"));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.match(path.basename(root), /^ruflo-game-test-/u);
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    return root;
}

test("model planning is bounded data and produces a playable-engine project without model code", async () => {
    let modelCalls = 0;
    const spec = await designGame("Build a small orbital yard collecting an orb", {
        async generate(prompt, maxTokens) {
            modelCalls++;
            assert.match(prompt, /orbital yard/u);
            assert.equal(maxTokens, 8192);
            return JSON.stringify(sample);
        },
    });
    assert.equal(modelCalls, 1);
    const root = tempRoot();
    try {
        const target = path.join(root, "orbital-yard");
        assert.equal(compileGameProject(spec, target), target);
        assert.ok(fs.existsSync(path.join(target, "project.godot")));
        assert.ok(fs.existsSync(path.join(target, "Main.tscn")));
        assert.ok(fs.existsSync(path.join(target, "Main.gd")));
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target, "world.json"), "utf8")), spec);
        assert.match(fs.readFileSync(path.join(target, "Main.gd"), "utf8"), /RigidBody3D/u);
        assert.throws(() => compileGameProject(spec, target), /already exists/u);
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});

test("malformed, oversized, executable and physically invalid model output fails closed", () => {
    assert.throws(() => parseModelGameSpec("not JSON"), SyntaxError);
    assert.throws(() => parseModelGameSpec("x".repeat(65537)), /limit/u);
    assert.throws(() => validateGameSpec({ ...sample, title: 'Game"; OS.execute("bad")' }), /plain-text/u);
    assert.throws(() => validateGameSpec({ ...sample, world: { ...sample.world, gravity: Number.NaN } }), /finite/u);
    assert.throws(() => validateGameSpec({ ...sample, props: [...sample.props, { ...sample.props[0], id: "crate_a" }] }), /unique/u);
    assert.throws(() => validateGameSpec({ ...sample, props: [{ ...sample.props[0], mass: -3 }] }), /finite/u);
    assert.throws(() => validateGameSpec({ ...sample, player: { ...sample.player, spawn: [0, -2, 0] } }), /above the ground/u);
    assert.throws(() => validateGameSpec({ ...sample, props: [{ ...sample.props[0], position: [2, 0, 0] }] }), /above the ground/u);
    assert.throws(() => validateGameSpec({ ...sample, goals: [] }), /at least one goal/u);
    assert.throws(() => validateGameSpec({ ...sample, props: Array(65).fill(sample.props[0]) }), /at most 64/u);
});

test("catalog assets are hash-pinned, self-contained, and selected only by safe ID", () => {
    const root = tempRoot();
    try {
        const file = path.join(root, "model.glb");
        const data = triangleGlb();
        fs.writeFileSync(file, data);
        const entry = { id: "sculpture", file, sha256: createHash("sha256").update(data).digest("hex"),
            source: "NYX generated deterministic fixture", license: "CC0-1.0" };
        const catalog = { version: 1, assets: [entry] };
        assert.deepEqual(inspectSelfContainedGlb(data), { meshes: 1, materials: 0 });
        assert.throws(() => inspectSelfContainedGlb(triangleGlb({ buffers: [{ byteLength: 36, uri: "../escape.bin" }] })), /External/u);
        assert.throws(() => inspectSelfContainedGlb(data.subarray(0, data.length - 1)), /Invalid/u);
        assert.throws(() => validateGameAssetCatalog({ ...catalog, assets: [{ ...entry, id: "../escape" }] }), /safe/u);
        assert.throws(() => validateGameAssetCatalog({ ...catalog, assets: [{ ...entry, sha256: "0" }] }), /SHA-256/u);

        const spec = { ...sample, props: [{ ...sample.props[0], visualAsset: "sculpture" }] };
        const project = compileGameProject(spec, path.join(root, "project"), catalog);
        assert.equal(fs.readFileSync(path.join(project, "assets", "sculpture.glb")).equals(data), true);
        const manifest = JSON.parse(fs.readFileSync(path.join(project, "asset-manifest.json"), "utf8"));
        assert.equal(manifest.assets[0].sha256, entry.sha256);
        assert.equal(manifest.assets[0].source, entry.source);
        assert.equal(manifest.assets[0].license, entry.license);
        assert.equal(JSON.stringify(manifest).includes(file), false, "Host source path leaked into project");
        assert.throws(() => compileGameProject(spec, path.join(root, "missing-catalog")), /Unregistered/u);
        assert.equal(fs.existsSync(path.join(root, "missing-catalog")), false);
        fs.writeFileSync(file, Buffer.from("tampered"));
        assert.throws(() => compileGameProject(spec, path.join(root, "tampered-project"), catalog), /bounded regular file|hash differs/u);
        assert.equal(fs.existsSync(path.join(root, "tampered-project")), false);
        assert.throws(() => validateGameSpec({ ...sample, props: [{ ...sample.props[0], visualAsset: "../../outside" }] }), /safe catalog/u);
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});

test("model planning sees asset names but never catalog host paths or credentials", async () => {
    const catalog = { version: 1 as const, assets: [{ id: "lantern", file: path.resolve("private/reviewed.glb"),
        sha256: "a".repeat(64), source: "https://example.org/lantern", license: "CC0-1.0" }] };
    const result = await designGame("Make a small playable lantern hunt", {
        async generate(instruction) {
            assert.match(instruction, /"lantern"/u);
            assert.doesNotMatch(instruction, /private|reviewed\.glb|example\.org/u);
            return JSON.stringify({ ...sample, props: [{ ...sample.props[0], visualAsset: "lantern" }] });
        },
    }, catalog);
    assert.equal(result.props[0].visualAsset, "lantern");
});
