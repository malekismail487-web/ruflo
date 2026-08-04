/**
 * Track A Master Runner & Evidence Generator
 * Executes Procedural Mesh Synthesis, OBJ File Export, Featherstone Kinematics, PBR Shading, and outputs raw evidence artifacts.
 */

const fs = require('fs');
const path = require('path');
const { ProceduralEngineGenerator } = require('./procedural_mesh_engine');
const { PhysicsIntegrator } = require('./physics_engine');
const { SoftwareRenderer } = require('./render_engine');

console.log("=========================================================================");
console.log("       TRACK A: NATIVE 3D ENGINE, PHYSICS & PBR RENDERER RUNNER          ");
console.log("=========================================================================");

// 1. Generate 3D Procedural Mesh
console.log("\n[TRACK A - STEP 1] Synthesizing Procedural 4-Cylinder Engine Assembly Mesh...");
const mesh = ProceduralEngineGenerator.generateFourCylinderEngine(0.85, 0.88, 4);
const objContent = ProceduralEngineGenerator.exportToOBJ(mesh);

const outputObjPath = path.join(__dirname, '../../scratch/four_cylinder_engine.obj');
fs.writeFileSync(outputObjPath, objContent, 'utf8');

const objStat = fs.statSync(outputObjPath);
console.log(` -> MESH GENERATION COMPLETE:`);
console.log(`    - Assembly Name: ${mesh.name}`);
console.log(`    - Total Vertices: ${mesh.vertices.length}`);
console.log(`    - Total Normals: ${mesh.normals.length}`);
console.log(`    - Total Faces (Triangles): ${mesh.faces.length}`);
console.log(`    - Exported OBJ File Path: ${outputObjPath}`);
console.log(`    - Exported File Size: ${objStat.size} bytes`);

// 2. Execute Reduced Coordinate Physics Dynamics
console.log("\n[TRACK A - STEP 2] Executing Featherstone Dynamics & Multi-Body Kinematics Simulation...");
const phys = new PhysicsIntegrator(3000, 0.044, 0.150); // 3000 RPM, 44mm throw, 150mm rod
const simResult = phys.runSimulation(0.020, 0.002); // 20ms simulation

console.log(` -> SIMULATION ENGINE METRICS:`);
console.log(`    - Input Shaft RPM: ${phys.rpm}`);
console.log(`    - Angular Velocity (omega): ${phys.omega.toFixed(5)} rad/s`);
console.log(`    - Gravitational Field (g): ${phys.gravity} m/s^2`);
console.log(`    - Total Time Steps Simulated: ${simResult.telemetry.length}`);
console.log(`    - Total Cylinder TDC/BDC Events Logged: ${simResult.collisionEvents.length}`);

console.log(`\n -> RAW FLOATING-POINT TELEMETRY (Sample Timesteps):`);
for (let i = 0; i < Math.min(5, simResult.telemetry.length); i++) {
  const frame = simResult.telemetry[i];
  const cyl0 = frame.cylinders[0];
  console.log(`    [Time ${frame.timeSeconds.toFixed(3)}s | Step ${frame.step}] Cyl 0 -> theta: ${cyl0.thetaRad.toFixed(4)} rad | y: ${cyl0.positionMeters.toFixed(5)}m | v: ${cyl0.velocityMps.toFixed(4)} m/s | Joint Drift: ${cyl0.jointDriftMm.toFixed(6)} mm`);
}

// 3. Render Cook-Torrance GGX PBR Viewport Frame
console.log("\n[TRACK A - STEP 3] Executing Cook-Torrance GGX PBR Software Rasterizer...");
const bmpBuffer = SoftwareRenderer.renderPBRPreview(256, 256);
const outputBmpPath = path.join(__dirname, '../../scratch/engine_pbr_preview.bmp');
fs.writeFileSync(outputBmpPath, bmpBuffer);

const bmpStat = fs.statSync(outputBmpPath);
console.log(` -> RENDER FRAME CAPTURED:`);
console.log(`    - Shader Model: Cook-Torrance GGX Specular BRDF + Schlick Fresnel + Smith Visibility`);
console.log(`    - Resolution: 256 x 256 pixels (24-bit RGB)`);
console.log(`    - Exported Render Artifact: ${outputBmpPath}`);
console.log(`    - Image File Size: ${bmpStat.size} bytes`);

console.log("\n=========================================================================");
console.log("   TRACK A EXECUTION SUCCESSFUL — ALL RAW ARTIFACTS SAVED TO DISK        ");
console.log("=========================================================================\n");
