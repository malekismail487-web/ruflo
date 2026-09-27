/** Bounded, data-only direction for a procedural landscape and monumental structure. */
export interface WorldArtSpec {
    version: 1;
    seed: number;
    terrain: {
        extent: number;
        resolution: number;
        relief: number;
        ridgeStrength: number;
        riverWidth: number;
    };
    citadel: {
        center: [number, number];
        radius: number;
        towerHeight: number;
        towerCount: number;
        palette: "limestone" | "obsidian" | "sandstone";
    };
    atmosphere: {
        timeOfDay: "dawn" | "day" | "dusk";
        fogDensity: number;
    };
    showcaseCamera: {
        position: [number, number, number];
        target: [number, number, number];
        fov: number;
    };
}

function object(value: unknown, name: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
    return value as Record<string, unknown>;
}

function bounded(value: unknown, name: string, min: number, max: number, integer = false): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
        throw new Error(`${name} must be ${integer ? "an integer" : "a finite number"} in [${min}, ${max}]`);
    }
    return value;
}

function vec2(value: unknown, name: string, min: number, max: number): [number, number] {
    if (!Array.isArray(value) || value.length !== 2) throw new Error(`${name} must contain two coordinates`);
    return [bounded(value[0], `${name}[0]`, min, max), bounded(value[1], `${name}[1]`, min, max)];
}

function vec3(value: unknown, name: string, min: number, max: number): [number, number, number] {
    if (!Array.isArray(value) || value.length !== 3) throw new Error(`${name} must contain three coordinates`);
    return [bounded(value[0], `${name}[0]`, min, max), bounded(value[1], `${name}[1]`, min, max),
        bounded(value[2], `${name}[2]`, min, max)];
}

export function validateWorldArtSpec(input: unknown): WorldArtSpec {
    const raw = object(input, "worldArt");
    if (raw.version !== 1) throw new Error("Unsupported worldArt version");
    const terrain = object(raw.terrain, "worldArt.terrain");
    const citadel = object(raw.citadel, "worldArt.citadel");
    const atmosphere = object(raw.atmosphere, "worldArt.atmosphere");
    const camera = object(raw.showcaseCamera, "worldArt.showcaseCamera");
    if (!["limestone", "obsidian", "sandstone"].includes(String(citadel.palette))) {
        throw new Error("Unsupported citadel palette");
    }
    if (!["dawn", "day", "dusk"].includes(String(atmosphere.timeOfDay))) {
        throw new Error("Unsupported time of day");
    }
    const extent = bounded(terrain.extent, "terrain.extent", 80, 200);
    const resolution = bounded(terrain.resolution, "terrain.resolution", 64, 256, true);
    const center = vec2(citadel.center, "citadel.center", -60, 60);
    const radius = bounded(citadel.radius, "citadel.radius", 10, 25);
    if (Math.abs(center[0]) + radius + 8 > extent / 2 || Math.abs(center[1]) + radius + 8 > extent / 2) {
        throw new Error("Citadel must fit inside the terrain with a safety margin");
    }
    const position = vec3(camera.position, "showcaseCamera.position", -120, 120);
    const target = vec3(camera.target, "showcaseCamera.target", -120, 120);
    if (Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]) < 5) {
        throw new Error("Showcase camera must be separated from its target");
    }
    return {
        version: 1,
        seed: bounded(raw.seed, "worldArt.seed", 0, 2_147_483_647, true),
        terrain: {
            extent, resolution,
            relief: bounded(terrain.relief, "terrain.relief", 2, 20),
            ridgeStrength: bounded(terrain.ridgeStrength, "terrain.ridgeStrength", 2, 30),
            riverWidth: bounded(terrain.riverWidth, "terrain.riverWidth", 2, 12),
        },
        citadel: {
            center, radius,
            towerHeight: bounded(citadel.towerHeight, "citadel.towerHeight", 12, 36),
            towerCount: bounded(citadel.towerCount, "citadel.towerCount", 4, 12, true),
            palette: citadel.palette as WorldArtSpec["citadel"]["palette"],
        },
        atmosphere: {
            timeOfDay: atmosphere.timeOfDay as WorldArtSpec["atmosphere"]["timeOfDay"],
            fogDensity: bounded(atmosphere.fogDensity, "atmosphere.fogDensity", 0, 0.03),
        },
        showcaseCamera: {
            position, target,
            fov: bounded(camera.fov, "showcaseCamera.fov", 30, 90),
        },
    };
}
