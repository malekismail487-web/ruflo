import assert from "node:assert/strict";
import { test } from "node:test";
import { NemotronClient } from "../src/core/nemotronClient.js";

test("Nemotron refuses to start without a configured credential", () => {
    const prior = process.env.NVIDIA_API_KEY;
    try {
        delete process.env.NVIDIA_API_KEY;
        assert.throws(() => new NemotronClient(), /NVIDIA API Key is required/u);
    } finally {
        if (prior === undefined) delete process.env.NVIDIA_API_KEY;
        else process.env.NVIDIA_API_KEY = prior;
    }
});

test("Nemotron accepts an injected credential without contacting the provider", () => {
    assert.ok(new NemotronClient("synthetic-test-key") instanceof NemotronClient);
});

