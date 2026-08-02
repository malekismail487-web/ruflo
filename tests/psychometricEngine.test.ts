import { describe, it, expect } from "vitest";
import { PsychometricEngine } from "../src/core/psychometricEngine.js";

describe("PsychometricEngine IRT/CAT Mathematical Computations", () => {
    it("should initialize baseline theta to 0 and detect API key configuration", () => {
        const engine = new PsychometricEngine("ale_live_EFHs4BuU8wPyejRBi3VYZ1lSLnaaTJKlJv6HZiwem0o");
        expect(engine.getTheta()).toBe(0);
    });

    it("should compute exact 2PL IRT theta updates and Fisher Information", () => {
        const engine = new PsychometricEngine();
        
        // Initial theta = 0, difficulty = 0, discrimination = 1.0
        // P(success) = 1 / (1 + exp(0)) = 0.5
        // success = 1, learningRate = 0.5 -> new theta = 0 + 0.5 * 1.0 * (1 - 0.5) = 0.25
        const theta1 = engine.updateTheta(0, 1, 1.0);
        expect(theta1).toBe(0.25);

        // Fisher Information I(theta) = a^2 * P * (1 - P) = 1^2 * 0.5 * 0.5 = 0.25
        const fisherInfo = engine.computeFisherInformation(0, 0, 1.0);
        expect(fisherInfo).toBe(0.25);
    });

    it("should evaluate prompt complexity within bounds [0, 10]", () => {
        const engine = new PsychometricEngine();
        
        const complexity = engine.evaluatePromptComplexity("a".repeat(150));
        expect(complexity).toBe(1.5);

        const extremeComplexity = engine.evaluatePromptComplexity("a".repeat(2000));
        expect(extremeComplexity).toBe(10);
    });

    it("should perform full psychometric profile evaluation asynchronously", async () => {
        const engine = new PsychometricEngine("ale_live_EFHs4BuU8wPyejRBi3VYZ1lSLnaaTJKlJv6HZiwem0o");
        const res = await engine.evaluatePsychometricProfile("Analyze quantum entanglement trajectory", 1.5, 1, 1.2);

        expect(res.apiKeyConfigured).toBe(true);
        expect(res.complexityScore).toBeGreaterThan(0);
        expect(res.successProbability).toBeGreaterThan(0);
        expect(res.standardError).toBeGreaterThan(0);
    });
});
