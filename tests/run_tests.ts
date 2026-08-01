import assert from "node:assert";
import { physicsSimEngine } from "../src/core/physicsSimEngine.js";
import { PsychometricEngine } from "../src/core/psychometricEngine.js";

async function run() {
    console.log("=== RUNNING BEHAVIORAL VERIFICATION SUITE ===");

    // 1. Rasch IRT Math Verification
    const engine = new PsychometricEngine();
    assert.strictEqual(engine.getTheta(), 0);
    
    // Initial theta=0, difficulty=0 -> P(success)=0.5 -> theta_new = 0 + 0.5*(1-0.5) = 0.25
    const theta1 = engine.updateTheta(0, 1);
    assert.strictEqual(theta1, 0.25);
    console.log("[PASS] IRT Rasch Math Step 1 (theta=0, diff=0, success=1) -> theta = 0.25");

    // Next: theta=0.25, difficulty=0.25 -> P(success)=0.5 -> theta_new = 0.25 + 0.5*(0-0.5) = 0.0
    const theta2 = engine.updateTheta(0.25, 0);
    assert.strictEqual(theta2, 0.0);
    console.log("[PASS] IRT Rasch Math Step 2 (theta=0.25, diff=0.25, success=0) -> theta = 0.0");

    // 2. Astronomical N-Body Dynamics Math Verification
    const bodies = [
        { id: "star", name: "Star", mass: 1.989e30, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, radius: 1000 },
        { id: "planet", name: "Planet", mass: 5.972e24, position: { x: 1.5e11, y: 0, z: 0 }, velocity: { x: 0, y: 30000, z: 0 }, radius: 10 }
    ];
    const orbitResult = physicsSimEngine.simulateOrbitalMechanics(bodies, 100);
    assert.strictEqual(orbitResult.length, 2);
    assert.ok(orbitResult[1].position.y > 0, "Planet Y position should increase due to positive Y velocity");
    console.log(`[PASS] Astronomical N-Body Gravitational Sim (Updated Planet Pos Y: ${orbitResult[1].position.y.toFixed(2)})`);

    // 3. Two-Bone Inverse Kinematics (IK) Rigging Math Verification
    const ik = physicsSimEngine.solveInverseKinematics({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }, 8, 8);
    assert.ok(!isNaN(ik.joint1AngleRad), "Joint1 angle should be valid number");
    assert.ok(!isNaN(ik.joint2AngleRad), "Joint2 angle should be valid number");
    console.log(`[PASS] Two-Bone IK Solver (Joint1 Rad: ${ik.joint1AngleRad.toFixed(4)}, Joint2 Rad: ${ik.joint2AngleRad.toFixed(4)})`);

    // 4. 3D Raycasting & Bounding Volume Intersection Verification
    const ray = physicsSimEngine.performRaycast({ x: 0, y: 0, z: -10 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 5);
    assert.strictEqual(ray.hit, true);
    assert.strictEqual(ray.distance, 5);
    assert.deepStrictEqual(ray.hitPoint, { x: 0, y: 0, z: -5 });
    console.log(`[PASS] 3D Raycast Sphere Intersection (Hit: true, Distance: 5, HitPoint: {x:0, y:0, z:-5})`);

    console.log("=== ALL MATHEMATICAL & BEHAVIORAL VERIFICATIONS PASSED ===");
}

run().catch(err => {
    console.error("Test Failure:", err);
    process.exit(1);
});
