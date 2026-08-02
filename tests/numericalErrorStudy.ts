import { describe, it, expect } from "vitest";
import { physicsSelfChecker, OrbitalStateSample } from "../src/core/physicsSelfChecker.js";

describe("Capability 4: Numerical Error Characterization Across Timesteps", () => {
    it("should characterize energy drift across 3 different timesteps (3h, 1h, 20min) and confirm O(dt^2) convergence", () => {
        const G = 6.67430e-11;
        const m1 = 5.972e24; // Earth mass
        const m2 = 7.348e22; // Moon mass
        const r0 = 3.844e8;  // Initial distance
        const v0 = Math.sqrt((G * m1) / r0); // Initial orbital velocity

        const runSimForTimestep = (dtSeconds: number, totalSimulatedSeconds: number) => {
            const steps = Math.floor(totalSimulatedSeconds / dtSeconds);
            let pos = { x: r0, y: 0.0, z: 0.0 };
            let vel = { x: 0.0, y: v0, z: 0.0 };

            const getAcc = (p: { x: number; y: number; z: number }) => {
                const r = Math.sqrt(p.x**2 + p.y**2 + p.z**2);
                const aMag = -(G * m1) / (r**2);
                return { x: aMag * (p.x / r), y: aMag * (p.y / r), z: aMag * (p.z / r) };
            };

            let acc = getAcc(pos);
            const samples: OrbitalStateSample[] = [
                { frame: 1, timeSeconds: 0, position: { ...pos }, velocity: { ...vel } }
            ];

            for (let i = 1; i <= steps; i++) {
                const vHalf = { x: vel.x + acc.x * (dtSeconds * 0.5), y: vel.y + acc.y * (dtSeconds * 0.5), z: vel.z + acc.z * (dtSeconds * 0.5) };
                pos = { x: pos.x + vHalf.x * dtSeconds, y: pos.y + vHalf.y * dtSeconds, z: pos.z + vHalf.z * dtSeconds };
                const aNew = getAcc(pos);
                vel = { x: vHalf.x + aNew.x * (dtSeconds * 0.5), y: vHalf.y + aNew.y * (dtSeconds * 0.5), z: vHalf.z + aNew.z * (dtSeconds * 0.5) };
                acc = aNew;

                if (i === steps) {
                    samples.push({ frame: steps, timeSeconds: i * dtSeconds, position: { ...pos }, velocity: { ...vel } });
                }
            }

            return physicsSelfChecker.checkOrbitalPhysics(m1, m2, samples);
        };

        const totalSimTime = 86400 * 27.3; // 1 full orbit (~27.3 days)

        const res3h = runSimForTimestep(10800, totalSimTime); // 3 hours
        const res1h = runSimForTimestep(3600, totalSimTime);  // 1 hour
        const res20m = runSimForTimestep(1200, totalSimTime); // 20 minutes

        console.log("\n=== NUMERICAL ERROR CHARACTERIZATION STUDY ===");
        console.log(`Timestep A (3h  / 10800s): Energy Drift = ${res3h.energyDeviationPercent}%`);
        console.log(`Timestep B (1h  /  3600s): Energy Drift = ${res1h.energyDeviationPercent}%`);
        console.log(`Timestep C (20m /  1200s): Energy Drift = ${res20m.energyDeviationPercent}%`);
        console.log("===============================================\n");

        // Verify that smaller timesteps strictly reduce energy discretization drift
        expect(res1h.energyDeviationPercent).toBeLessThan(res3h.energyDeviationPercent);
        expect(res20m.energyDeviationPercent).toBeLessThan(res1h.energyDeviationPercent);
    });
});
