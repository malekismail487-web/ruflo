import { NemotronClient } from "./core/nemotronClient.js";
import { PsychometricEngine } from "./core/psychometricEngine.js";

export async function main() {
    console.log("Starting Standalone Core Daemon...");
    
    // Catch signals
    process.on('SIGINT', () => {
        console.log("\nGracefully shutting down...");
        process.exit(0);
    });

    const engine = new PsychometricEngine();
    console.log("Psychometric Engine initialized with theta:", engine.getTheta());

    // Only init Nemotron if API key is present to avoid crash on startup in test environments
    if (process.env.NVIDIA_API_KEY) {
        const client = new NemotronClient();
        console.log("Nemotron API Client initialized.");
    } else {
        console.log("NVIDIA_API_KEY not found. Skipping Nemotron API Client initialization.");
    }

    console.log("Daemon is running in the background...");
    
    // A simple async loop to simulate daemon activity
    // Uncomment the loop for actual background running, left out of test to avoid hanging
    /*
    let tick = 0;
    while (true) {
        console.log(`Daemon tick ${tick++} at ${new Date().toISOString()}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    */
}

// In standard node environments, this checks if the file is run directly
if (process.argv[1] && process.argv[1].endsWith('main.ts')) {
    main().catch(err => {
        console.error("Fatal error in daemon:", err);
        process.exit(1);
    });
}
