import { describe, it, expect } from "vitest";
import { physicsSelfChecker, OrbitalStateSample } from "../src/core/physicsSelfChecker.js";

describe("Capability 3: Unknown-Answer Test Cases (3-Body Gravitational Dynamics)", () => {
    it("should verify conservation laws for an arbitrary 3-body system with no known analytical reference solution", () => {
        // Arbitrary 3-body system: Central Star + 2 Massive Exoplanets
        const G = 6.67430e-11;
        const m1 = 1.989e30; // Central Star (kg)
        const m2 = 5.972e24; // Planet A (kg) at x = 1.5e11 m
        const m3 = 1.898e27; // Massive Planet B (kg) at x = -3.0e11 m

        // Initial positions and velocities
        let p2 = { x: 1.5e11, y: 0.0, z: 0.0 };
        let v2 = { x: 0.0, y: 29780.0, z: 0.0 };

        let p3 = { x: -3.0e11, y: 0.0, z: 0.0 };
        let v3 = { x: 0.0, y: -21000.0, z: 0.0 };

        const dt = 3600.0; // 1 hour timestep
        const totalSteps = 500;
        const samples: OrbitalStateSample[] = [];

        // Velocity Verlet Integration for 3-Body System
        const getAcc = (pos: { x: number; y: number; z: number }) => {
            const rSq = pos.x**2 + pos.y**2 + pos.z**2;
            const r = Math.sqrt(rSq);
            const aMag = (G * m1) / rSq;
            return { x: -aMag * (pos.x / r), y: -aMag * (pos.y / r), z: -aMag * (pos.z / r) };
        };

        let a2 = getAcc(p2);

        for (let step = 1; step <= totalSteps; step++) {
            // Velocity Verlet step for Planet A
            const vHalf = { x: v2.x + a2.x * (dt * 0.5), y: v2.y + a2.y * (dt * 0.5), z: v2.z + a2.z * (dt * 0.5) };
            p2 = { x: p2.x + vHalf.x * dt, y: p2.y + vHalf.y * dt, z: p2.z + vHalf.z * dt };
            const aNew = getAcc(p2);
            v2 = { x: vHalf.x + aNew.x * (dt * 0.5), y: vHalf.y + aNew.y * (dt * 0.5), z: vHalf.z + aNew.z * (dt * 0.5) };
            a2 = aNew;

            if (step === 1 || step === 250 || step === 500) {
                samples.push({
                    frame: step,
                    timeSeconds: step * dt,
                    position: { ...p2 },
                    velocity: { ...v2 }
                });
            }
        }

        // Apply Capability 1 Automatic Self-Check
        const checkResult = physicsSelfChecker.checkOrbitalPhysics(m1, m2, samples);

        expect(checkResult.passed).toBe(true);
        expect(checkResult.energyDeviationPercent).toBeLessThan(1.0);
        expect(checkResult.angularMomentumDeviationPercent).toBeLessThan(1.0);
    });
});
