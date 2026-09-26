import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectPngEvidence } from "../src/core/renderEvidence.js";
import { UnrealDetector } from "../src/core/unrealDetector.js";

// Independently encoded 1 x 1 PNG fixture from System.Drawing. The production
// validator is exercised on bytes not generated with its own CRC implementation.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY/jPwPAfAAUAAf+mXJtdAAAAAElFTkSuQmCC", "base64");

test("only fresh, structurally valid PNG artifacts count as render evidence", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-render-test-"));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.match(path.basename(root), /^ruflo-render-test-/u);
    const artifact = path.join(root, "frame.png");
    try {
        fs.writeFileSync(artifact, png);
        assert.deepEqual(inspectPngEvidence(artifact), { valid: true, width: 1, height: 1 });
        assert.equal(inspectPngEvidence(artifact, Date.now() + 10_000).reason, "stale_output");
        const corrupt = Buffer.from(png);
        corrupt[45] ^= 1;
        fs.writeFileSync(artifact, corrupt);
        assert.equal(inspectPngEvidence(artifact).reason, "crc_mismatch");
        fs.writeFileSync(artifact, "UNREAL_ENGINE_RENDER_EVIDENCE_OK");
        assert.equal(inspectPngEvidence(artifact).valid, false);
        assert.equal(inspectPngEvidence(path.join(root, "missing.png")).reason, "unreadable_output");
    } finally {
        fs.rmSync(root, { recursive: true });
    }
});

test("an executable path alone does not verify Unreal plugins or native rendering", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ruflo-detector-test-"));
    assert.equal(path.dirname(root), os.tmpdir());
    assert.match(path.basename(root), /^ruflo-detector-test-/u);
    const candidate = path.join(root, "UnrealEditor-Cmd.exe");
    const prior = process.env.UNREAL_ENGINE_PATH;
    try {
        fs.writeFileSync(candidate, "not a verified Unreal installation");
        process.env.UNREAL_ENGINE_PATH = candidate;
        const result = new UnrealDetector().detectEnvironment();
        assert.equal(result.available, false);
        assert.equal(result.fallbackRecommended, true);
        assert.equal(result.plugins.every(plugin => !plugin.available), true);
    } finally {
        if (prior === undefined) delete process.env.UNREAL_ENGINE_PATH;
        else process.env.UNREAL_ENGINE_PATH = prior;
        fs.rmSync(root, { recursive: true });
    }
});
