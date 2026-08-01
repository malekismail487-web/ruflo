import { NemotronClient } from "../src/core/nemotronClient.js";
import { blenderEngine } from "../src/core/blenderEngine.js";

async function run() {
    console.log("=== NEMOTRON + HEADLESS BLENDER END-TO-END VERIFICATION LOOP ===");
    
    const apiKey = process.env.NVIDIA_API_KEY || "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";
    const client = new NemotronClient(apiKey, "nvidia/nemotron-3-ultra-550b-a55b");

    const userPrompt = `System: Output ONLY valid, executable Python code using the Blender 'bpy' module. Do not include markdown code block backticks (e.g. \`\`\`python). Start directly with import bpy.

Task: Write a bpy script that creates a red sphere and a blue cube side by side, with basic lighting and a camera positioned to view both objects, and renders one frame.`;

    console.log("Sending prompt to NVIDIA Nemotron 3 Ultra 550B (nvidia/nemotron-3-ultra-550b-a55b)...");
    const rawNemotronOutput = await client.generate(userPrompt, 1024);
    
    console.log("\n--- RAW NEMOTRON GENERATED OUTPUT ---");
    console.log(rawNemotronOutput);
    console.log("-------------------------------------\n");

    // Clean markdown code blocks if Nemotron included any formatting
    let cleanBpyScript = rawNemotronOutput;
    if (cleanBpyScript.includes("```")) {
        cleanBpyScript = cleanBpyScript.replace(/```python/g, "").replace(/```/g, "").trim();
    }

    console.log("Executing script in Headless Blender background process...");
    const renderResult = await blenderEngine.executeScriptAndRender(cleanBpyScript, "red_sphere_blue_cube.png");

    console.log("\n=== BLENDER RENDER RESULT ===");
    console.log("Success:", renderResult.success);
    if (renderResult.outputImagePath) {
        console.log("Rendered Image Path:", renderResult.outputImagePath);
    }
    if (renderResult.error) {
        console.log("Error Trace:\n", renderResult.error);
    }
    console.log("\nBlender Stdout Snippet:\n", renderResult.stdout.slice(-1000));
}

run().catch(console.error);
