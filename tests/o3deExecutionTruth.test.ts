import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SceneGraph } from "../src/core/sceneGraph.js";
import { O3DEEngineBackend } from "../src/core/o3deEngine.js";

function safeTemporaryRoot(projectPath: string): string {
    const root = path.dirname(path.dirname(projectPath));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.match(path.basename(root), /^ruflo-o3de-/u);
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    return root;
}

test("script preparation is not reported as engine execution or rendering", async () => {
    const backend = new O3DEEngineBackend();
    const scene = new SceneGraph("scene-1", "First Scene");
    scene.addNode({
        id: "box-1", name: "Box", childrenIds: [],
        transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        }, mesh: { id: "mesh-1", primitiveType: "box" },
    });
    const result = await backend.executeSceneGraph(scene, "frame.png");
    const root = safeTemporaryRoot(result.projectPath!);
    try {
        assert.equal(result.success, false);
        assert.equal(result.status, "SCRIPT_PREPARED");
        assert.equal(result.outputImagePath, undefined);
        assert.equal(result.stats.atomRenderPipelineEnabled, false);
        assert.equal(result.stats.physXEnabled, false);
        assert.equal(result.stats.terrainMeshEnabled, false);
        assert.ok(result.scriptPath && fs.existsSync(result.scriptPath));
        assert.ok(result.projectPath && fs.existsSync(result.projectPath));
        assert.equal(fs.existsSync(path.join(root, "frame.png")), false);
        assert.match(result.error ?? "", /have not occurred/u);
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});

test("unsafe filenames and invalid scene data fail before workspace creation", async () => {
    const backend = new O3DEEngineBackend();
    const scene = new SceneGraph("scene-2", "Unsafe Scene");
    await assert.rejects(backend.executeSceneGraph(scene, "../outside.png"), /simple PNG filename/u);
    scene.addNode({
        id: "bad", name: "Bad", childrenIds: [],
        transform: {
            position: { x: Number.NaN, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        },
    });
    await assert.rejects(backend.executeSceneGraph(scene, "frame.png"), /Invalid O3DE scene node/u);
});

test("untrusted node names remain Python string data, not executable lines", async () => {
    const backend = new O3DEEngineBackend();
    const scene = new SceneGraph("scene-3", "Trusted");
    const hostileName = 'Box\")\n__import__("os").system("echo injected")\n#';
    scene.addNode({
        id: "hostile", name: hostileName, childrenIds: [],
        transform: {
            position: { x: 1, y: 2, z: 3 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        },
    });
    const result = await backend.executeSceneGraph(scene, "frame.png");
    const root = safeTemporaryRoot(result.projectPath!);
    try {
        assert.ok(result.scriptPayload.includes(JSON.stringify(hostileName)));
        assert.equal(result.scriptPayload.includes('\n__import__("os").system'), false);
        assert.equal(result.success, false);
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});
