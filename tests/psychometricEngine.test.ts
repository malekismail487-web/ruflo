import { describe, it, expect } from "vitest";
import { PsychometricEngine } from "../src/core/psychometricEngine.js";

describe("PsychometricEngine IRT/CAT Mathematical Computations", () => {
    it("should initialize baseline theta to 0", () => {
        const engine = new PsychometricEngine();
        expect(engine.getTheta()).toBe(0);
    });

    it("should compute exact Rasch IRT theta update values", () => {
        const engine = new PsychometricEngine();
        
        // Initial theta = 0, difficulty = 0 -> P(success) = 1 / (1 + exp(0)) = 0.5
        // success = 1, learningRate = 0.5 -> new theta = 0 + 0.5 * (1 - 0.5) = 0.25
        const theta1 = engine.updateTheta(0, 1);
        expect(theta1).toBe(0.25);

        // Next: theta = 0.25, difficulty = 0.25 -> P(success) = 1 / (1 + exp(0)) = 0.5
        // success = 0, learningRate = 0.5 -> new theta = 0.25 + 0.5 * (0 - 0.5) = 0.0
        const theta2 = engine.updateTheta(0.25, 0);
        expect(theta2).toBe(0);
    });

    it("should evaluate prompt complexity heuristic accurately within bounds [0, 10]", () => {
        const engine = new PsychometricEngine();
        
        // Length = 150, theta = 0 -> score = (150 / 100) + 0 = 1.5
        const complexity = engine.evaluatePromptComplexity("a".repeat(150));
        expect(complexity).toBe(1.5);

        // Verify clamping for extreme prompt lengths
        const extremeComplexity = engine.evaluatePromptComplexity("a".repeat(2000));
        expect(extremeComplexity).toBe(10);
    });
});
