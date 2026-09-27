import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { GameAssetCatalog, readVerifiedGameAsset, validateGameAssetCatalog } from "./gameAssets.js";
import { GeometryRecipe, generateGeometry, validateGeometryRecipe } from "./proceduralGeometry.js";

export interface GameSpec {
    version: 1;
    title: string;
    world: { skyColor: string; groundColor: string; gravity: number };
    player: { spawn: [number, number, number]; speed: number; jumpVelocity: number };
    props: Array<{
        id: string;
        shape: "box" | "sphere" | "cylinder";
        body: "static" | "dynamic";
        position: [number, number, number];
        size: [number, number, number];
        color: string;
        mass?: number;
        visualAsset?: string;
    }>;
    generatedGeometry?: GeometryRecipe[];
    goals: Array<{ id: string; position: [number, number, number] }>;
}

function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object");
    return value as Record<string, unknown>;
}

function boundedNumber(value: unknown, field: string, min: number, max: number): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
        throw new Error(`${field} must be a finite number in [${min}, ${max}]`);
    }
    return value;
}

function label(value: unknown, field: string): string {
    if (typeof value !== "string" || !/^[\p{L}\p{N} _.-]{1,80}$/u.test(value)) {
        throw new Error(`${field} must be a short plain-text label`);
    }
    return value;
}

function color(value: unknown, field: string): string {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/u.test(value)) {
        throw new Error(`${field} must be a six-digit hex color`);
    }
    return value;
}

function vector(value: unknown, field: string, min: number, max: number): [number, number, number] {
    if (!Array.isArray(value) || value.length !== 3) throw new Error(`${field} must contain three coordinates`);
    return [0, 1, 2].map(i => boundedNumber(value[i], `${field}[${i}]`, min, max)) as [number, number, number];
}

/** Model text is untrusted data. Only this bounded schema can reach the engine. */
export function validateGameSpec(input: unknown): GameSpec {
    const raw = record(input);
    if (raw.version !== 1) throw new Error("Unsupported game specification version");
    const world = record(raw.world);
    const player = record(raw.player);
    if (!Array.isArray(raw.props) || raw.props.length > 64) throw new Error("props must contain at most 64 items");
    if (!Array.isArray(raw.goals) || raw.goals.length > 16) throw new Error("goals must contain at most 16 items");
    const ids = new Set<string>();
    const uniqueId = (value: unknown): string => {
        if (typeof value !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/u.test(value) || ids.has(value)) {
            throw new Error("Every prop and goal needs a unique safe id");
        }
        ids.add(value);
        return value;
    };
    const props = raw.props.map((item: unknown) => {
        const p = record(item);
        if (p.shape !== "box" && p.shape !== "sphere" && p.shape !== "cylinder") throw new Error("Unsupported prop shape");
        if (p.body !== "static" && p.body !== "dynamic") throw new Error("Unsupported physics body");
        const shape = p.shape as GameSpec["props"][number]["shape"];
        const body = p.body as GameSpec["props"][number]["body"];
        const size = vector(p.size, "prop.size", 0.1, 20);
        const position = vector(p.position, "prop.position", -100, 100);
        const halfHeight = shape === "sphere" ? size[0] * 0.5 : size[1] * 0.5;
        if (body === "dynamic" && position[1] < halfHeight + 0.05) {
            throw new Error("Dynamic props must spawn above the ground collider");
        }
        const mass = body === "dynamic" ? boundedNumber(p.mass, "prop.mass", 0.1, 1000) : undefined;
        if (p.visualAsset !== undefined && (typeof p.visualAsset !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/u.test(p.visualAsset))) {
            throw new Error("visualAsset must be a safe catalog ID");
        }
        return {
            id: uniqueId(p.id), shape, body,
            position, size,
            color: color(p.color, "prop.color"), ...(mass === undefined ? {} : { mass }),
            ...(p.visualAsset === undefined ? {} : { visualAsset: p.visualAsset }),
        };
    });
    const goals = raw.goals.map((item: unknown) => {
        const goal = record(item);
        const position = vector(goal.position, "goal.position", -100, 100);
        if (position[1] < 0.5) throw new Error("Goals must be above the ground collider");
        return { id: uniqueId(goal.id), position };
    });
    if (goals.length === 0) throw new Error("A playable game requires at least one goal");
    if (raw.generatedGeometry !== undefined && (!Array.isArray(raw.generatedGeometry) || raw.generatedGeometry.length > 4)) {
        throw new Error("generatedGeometry must contain at most four bounded recipes");
    }
    const generatedGeometry = (raw.generatedGeometry as unknown[] | undefined)?.map(validateGeometryRecipe);
    const generatedIds = new Set<string>();
    for (const recipe of generatedGeometry ?? []) {
        if (generatedIds.has(recipe.id)) throw new Error("Generated geometry IDs must be unique");
        generatedIds.add(recipe.id);
    }
    const spawn = vector(player.spawn, "player.spawn", -50, 50);
    if (spawn[1] < 1) throw new Error("Player must spawn above the ground collider");
    return {
        version: 1,
        title: label(raw.title, "title"),
        world: {
            skyColor: color(world.skyColor, "world.skyColor"),
            groundColor: color(world.groundColor, "world.groundColor"),
            gravity: boundedNumber(world.gravity, "world.gravity", 0.1, 40),
        },
        player: {
            spawn,
            speed: boundedNumber(player.speed, "player.speed", 1, 20),
            jumpVelocity: boundedNumber(player.jumpVelocity, "player.jumpVelocity", 1, 20),
        },
        props,
        ...(generatedGeometry === undefined ? {} : { generatedGeometry }),
        goals,
    };
}

export function parseModelGameSpec(output: string): GameSpec {
    if (output.length > 65536) throw new Error("Model response exceeded the game specification limit");
    let candidate = output.trim();
    if (candidate.startsWith("```")) candidate = candidate.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    return validateGameSpec(JSON.parse(candidate));
}

export interface GameDesignModel { generate(prompt: string, maxTokens: number): Promise<string> }

export async function designGame(prompt: string, model: GameDesignModel, catalog?: GameAssetCatalog): Promise<GameSpec> {
    if (prompt.length < 8 || prompt.length > 4000) throw new Error("Prompt must contain 8-4000 characters");
    const availableAssets = catalog ? validateGameAssetCatalog(catalog).assets.map(asset => asset.id) : [];
    const instruction = `Design a small playable 3D game prototype from the following request. Return ONLY JSON, no code or Markdown. Schema: {"version":1,"title":"short plain text","world":{"skyColor":"#RRGGBB","groundColor":"#RRGGBB","gravity":9.8},"player":{"spawn":[0,2,0],"speed":6,"jumpVelocity":6},"props":[{"id":"sculpture","shape":"box|sphere|cylinder","body":"static|dynamic","position":[0,2,0],"size":[2,2,2],"color":"#RRGGBB","mass":2,"visualAsset":"optional-generated-or-catalog-id"}],"generatedGeometry":[{"id":"original_sculpture","resolution":48,"color":"#bdac91","metallic":0.6,"roughness":0.35,"root":{"kind":"subtract","left":{"kind":"sphere","radius":0.8},"right":{"kind":"cylinder","radius":0.25,"halfHeight":0.9}}}],"goals":[{"id":"goal1","position":[2,1,0]}]}. To create original geometry, add up to four generatedGeometry recipes and reference their IDs from props.visualAsset. Geometry is an SDF graph inside normalized coordinates -1..1: sphere(radius), box(halfSize:[x,y,z],roundness), cylinder(radius,halfHeight), torus(majorRadius,minorRadius), union/intersection/subtract/smoothUnion(radius,left,right), translate(offset:[x,y,z],child), rotateY(degrees,child), scale(factor,child), radialArray(count,radius,child). Maximum 48 nodes, depth 12, resolution 20..72; keep all geometry within [-1,1]. Generated geometry is actual mesh generation, not an imported model; use it when the user asks you to create an original asset. Limits: 64 props, 16 goals, world coordinates -100..100, dimensions 0.1..20. Keep the player above ground. Use distinct ids. Approved imported visualAsset IDs, if any: ${JSON.stringify(availableAssets)}. Asset IDs never grant file access. Do not claim photorealism or scientific validity. User request:\n${prompt}`;
    return parseModelGameSpec(await model.generate(instruction, 8192));
}

/** Creates a new Godot project atomically; never overwrites an existing output. */
export function compileGameProject(specInput: unknown, outputDirectory: string, catalogInput?: unknown): string {
    const spec = validateGameSpec(specInput);
    const catalog = catalogInput === undefined ? { version: 1 as const, assets: [] } : validateGameAssetCatalog(catalogInput);
    const selected = new Map<string, ReturnType<typeof readVerifiedGameAsset> & { id: string; sha256: string; source: string; license: string;
        origin?: "generated" | "imported"; recipeSha256?: string; triangles?: number; vertices?: number }>();
    const recipes = new Map((spec.generatedGeometry ?? []).map(recipe => [recipe.id, recipe]));
    for (const asset of catalog.assets) {
        if (recipes.has(asset.id)) throw new Error(`Generated and imported geometry ID collision: ${asset.id}`);
    }
    for (const prop of spec.props) {
        if (!prop.visualAsset || selected.has(prop.visualAsset)) continue;
        const recipe = recipes.get(prop.visualAsset);
        if (recipe) {
            const generated = generateGeometry(recipe);
            selected.set(recipe.id, { id: recipe.id, data: generated.data, sha256: generated.sha256,
                recipeSha256: generated.recipeSha256, triangles: generated.triangles, vertices: generated.vertices,
                meshes: 1, materials: 1, origin: "generated", source: "NYX procedural geometry v1",
                license: "Generated original; downstream rights review required" });
            continue;
        }
        const asset = catalog.assets.find(item => item.id === prop.visualAsset);
        if (!asset) throw new Error(`Unregistered visual asset: ${prop.visualAsset}`);
        selected.set(asset.id, { id: asset.id, sha256: asset.sha256, source: asset.source,
            license: asset.license, origin: "imported", ...readVerifiedGameAsset(asset) });
    }
    const output = path.resolve(outputDirectory);
    const parent = path.dirname(output);
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) throw new Error("Output parent directory does not exist");
    if (fs.existsSync(output)) throw new Error("Output directory already exists");
    const stage = path.join(parent, `.ruflo-game-${randomUUID()}`);
    fs.mkdirSync(stage, { recursive: false });
    try {
        const template = fileURLToPath(new URL("./godotGameRuntime.gd", import.meta.url));
        fs.copyFileSync(template, path.join(stage, "Main.gd"));
        if (selected.size > 0) {
            const assetDirectory = path.join(stage, "assets");
            fs.mkdirSync(assetDirectory);
            for (const asset of selected.values()) fs.writeFileSync(path.join(assetDirectory, `${asset.id}.glb`), asset.data);
        }
        fs.writeFileSync(path.join(stage, "asset-manifest.json"), JSON.stringify({ version: 1, assets: [...selected.values()].map(({ data: _data, ...asset }) => asset) }, null, 2) + "\n");
        fs.writeFileSync(path.join(stage, "world.json"), JSON.stringify(spec, null, 2) + "\n");
        fs.writeFileSync(path.join(stage, "Main.tscn"), '[gd_scene load_steps=2 format=3]\n\n[ext_resource type="Script" path="res://Main.gd" id="1"]\n\n[node name="Main" type="Node3D"]\nscript = ExtResource("1")\n');
        fs.writeFileSync(path.join(stage, "project.godot"), `config_version=5\n\n[application]\nconfig/name=${JSON.stringify(spec.title)}\nrun/main_scene="res://Main.tscn"\n\n[physics]\n3d/default_gravity=${spec.world.gravity}\n\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n`);
        fs.renameSync(stage, output);
        return output;
    } catch (error) {
        if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: false });
        throw error;
    }
}
