import { describe, it, expect } from "vitest";
import { physicsSimEngine, CelestialBody, Vector3D } from "../src/core/physicsSimEngine.js";

describe("PhysicsSimEngine Math & Simulation", () => {
    it("should simulate astronomical N-body gravitational mechanics", () => {
        const bodies: CelestialBody[] = [
            { id: "star", name: "Star", mass: 1.989e30, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, radius: 1000 },
            { id: "planet", name: "Planet", mass: 5.972e24, position: { x: 1.5e11, y: 0, z: 0 }, velocity: { x: 0, y: 30000, z: 0 }, radius: 10 }
        ];

        const result = physicsSimEngine.simulateOrbitalMechanics(bodies, 100);
        expect(result.length).toBe(2);
        expect(result[1].position.y).toBeGreaterThan(0);
    });

    it("should generate 3D neural topologies and dendritic connections", () => {
        const layerCounts = [10, 20, 10];
        const bbox: Vector3D = { x: 50, y: 50, z: 100 };
        const neurons = physicsSimEngine.generate3DNeuralTopology(layerCounts, bbox);

        expect(neurons.length).toBe(40);
        expect(neurons[0].layer).toBe(0);
        expect(neurons[0].dendriteTargetIds.length).toBeGreaterThan(0);
    });

    it("should solve two-bone inverse kinematics (IK) for rigging animation", () => {
        const rootPos: Vector3D = { x: 0, y: 0, z: 0 };
        const targetPos: Vector3D = { x: 10, y: 10, z: 0 };
        const ikResult = physicsSimEngine.solveInverseKinematics(rootPos, targetPos, 8, 8);

        expect(ikResult.joint1AngleRad).toBeDefined();
        expect(ikResult.joint2AngleRad).toBeDefined();
        expect(isNaN(ikResult.joint1AngleRad)).toBe(false);
    });

    it("should perform 3D raycasting and sphere intersection testing", () => {
        const rayOrigin: Vector3D = { x: 0, y: 0, z: -10 };
        const rayDirection: Vector3D = { x: 0, y: 0, z: 1 };
        const sphereCenter: Vector3D = { x: 0, y: 0, z: 0 };

        const raycastResult = physicsSimEngine.performRaycast(rayOrigin, rayDirection, sphereCenter, 5);
        expect(raycastResult.hit).toBe(true);
        expect(raycastResult.distance).toBe(5);
        expect(raycastResult.hitPoint).toEqual({ x: 0, y: 0, z: -5 });
    });
});
