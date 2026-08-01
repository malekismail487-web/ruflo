import { NemotronClient } from "../src/core/nemotronClient.js";
import { blenderEngine } from "../src/core/blenderEngine.js";

export async function runOrbitalAnimationPipeline() {
    const apiKey = process.env.NVIDIA_API_KEY || "";
    const client = new NemotronClient(apiKey, "nvidia/nemotron-3-ultra-550b-a55b");

    const promptText = `System: You are an expert computational physicist and Blender Python programmer. Output ONLY valid, executable Python code using Blender 'bpy', 'math', and 'mathutils' modules. Do NOT wrap code in markdown code blocks. Start immediately with import bpy.

Task: Write a Blender Python script that creates a 2-body Earth-Moon orbital simulation over 250 frames.
Requirements:
1. Physical constants:
   - G = 6.67430e-11
   - Earth mass m1 = 5.972e24 kg, location (0,0,0)
   - Moon mass m2 = 7.348e22 kg, initial position (3.844e8, 0, 0) meters
   - Scale factor: 1 Blender Unit (BU) = 3.844e7 meters (so initial Moon distance = 10.0 BU)
   - Initial circular orbital velocity v0 = sqrt(G * m1 / 3.844e8) m/s in +Y direction.
2. Integration & Timestep:
   - dt = 10800 seconds per frame (3 hours per frame). 250 frames = 31.25 simulated days.
   - Implement Velocity Verlet or RK4 integration to step the Moon position.
3. Scene Setup:
   - Clear existing objects.
   - Create Earth sphere at origin (radius 1.5 BU, blue material).
   - Create Moon sphere (radius 0.4 BU, gray material).
   - Loop frame from 1 to 250: step physics, update Moon location, insert keyframe (moon.keyframe_insert(data_path="location", frame=frame)).
   - Add Camera at (0, -30, 15) looking at origin, add Sun light at (10, -10, 20).
   - Set scene frame_end = 250, render resolution 800x600.`;

    const rawOutput = await client.generate(promptText, 3000);
    const renderResult = await blenderEngine.executeScriptAndRender(rawOutput, "orbit_frame_####.png");
    return { rawOutput, renderResult };
}
