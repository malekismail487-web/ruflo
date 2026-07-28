import { describe, it, expect } from 'vitest';
import { PsychometricEngine } from '../src/core/psychometricEngine.js';

describe('PsychometricEngine', () => {
    it('should initialize with theta 0', () => {
        const engine = new PsychometricEngine();
        expect(engine.getTheta()).toBe(0);
    });

    it('should update theta correctly on success', () => {
        const engine = new PsychometricEngine();
        const newTheta = engine.updateTheta(1, 1);
        expect(newTheta).toBeGreaterThan(0);
    });

    it('should update theta correctly on failure', () => {
        const engine = new PsychometricEngine();
        const newTheta = engine.updateTheta(1, 0);
        expect(newTheta).toBeLessThan(0);
    });

    it('should evaluate prompt complexity based on length', () => {
        const engine = new PsychometricEngine();
        const shortPrompt = engine.evaluatePromptComplexity("hello");
        const longPrompt = engine.evaluatePromptComplexity("hello".repeat(20));
        expect(longPrompt).toBeGreaterThan(shortPrompt);
    });
});
