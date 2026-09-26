import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compileGameProject, designGame, parseModelGameSpec, validateGameSpec } from "../src/core/gameProject.js";

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
            assert.equal(maxTokens, 4096);
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
    assert.throws(() => parseModelGameSpec("x".repeat(32769)), /limit/u);
    assert.throws(() => validateGameSpec({ ...sample, title: 'Game"; OS.execute("bad")' }), /plain-text/u);
    assert.throws(() => validateGameSpec({ ...sample, world: { ...sample.world, gravity: Number.NaN } }), /finite/u);
    assert.throws(() => validateGameSpec({ ...sample, props: [...sample.props, { ...sample.props[0], id: "crate_a" }] }), /unique/u);
    assert.throws(() => validateGameSpec({ ...sample, props: [{ ...sample.props[0], mass: -3 }] }), /finite/u);
    assert.throws(() => validateGameSpec({ ...sample, player: { ...sample.player, spawn: [0, -2, 0] } }), /above the ground/u);
    assert.throws(() => validateGameSpec({ ...sample, props: [{ ...sample.props[0], position: [2, 0, 0] }] }), /above the ground/u);
    assert.throws(() => validateGameSpec({ ...sample, goals: [] }), /at least one goal/u);
    assert.throws(() => validateGameSpec({ ...sample, props: Array(65).fill(sample.props[0]) }), /at most 64/u);
});
