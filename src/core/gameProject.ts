import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

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
    }>;
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
        const mass = body === "dynamic" ? boundedNumber(p.mass, "prop.mass", 0.1, 1000) : undefined;
        return {
            id: uniqueId(p.id), shape, body,
            position: vector(p.position, "prop.position", -100, 100), size,
            color: color(p.color, "prop.color"), ...(mass === undefined ? {} : { mass }),
        };
    });
    const goals = raw.goals.map((item: unknown) => {
        const goal = record(item);
        return { id: uniqueId(goal.id), position: vector(goal.position, "goal.position", -100, 100) };
    });
    return {
        version: 1,
        title: label(raw.title, "title"),
        world: {
            skyColor: color(world.skyColor, "world.skyColor"),
            groundColor: color(world.groundColor, "world.groundColor"),
            gravity: boundedNumber(world.gravity, "world.gravity", 0.1, 40),
        },
        player: {
            spawn: vector(player.spawn, "player.spawn", -50, 50),
            speed: boundedNumber(player.speed, "player.speed", 1, 20),
            jumpVelocity: boundedNumber(player.jumpVelocity, "player.jumpVelocity", 1, 20),
        },
        props,
        goals,
    };
}

export function parseModelGameSpec(output: string): GameSpec {
    if (output.length > 32768) throw new Error("Model response exceeded the game specification limit");
    let candidate = output.trim();
    if (candidate.startsWith("```")) candidate = candidate.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    return validateGameSpec(JSON.parse(candidate));
}

export interface GameDesignModel { generate(prompt: string, maxTokens: number): Promise<string> }

export async function designGame(prompt: string, model: GameDesignModel): Promise<GameSpec> {
    if (prompt.length < 8 || prompt.length > 4000) throw new Error("Prompt must contain 8-4000 characters");
    const instruction = `Design a small playable 3D game prototype from the following request. Return ONLY JSON, no code or Markdown. Schema: {"version":1,"title":"short plain text","world":{"skyColor":"#RRGGBB","groundColor":"#RRGGBB","gravity":9.8},"player":{"spawn":[0,2,0],"speed":6,"jumpVelocity":6},"props":[{"id":"crate1","shape":"box|sphere|cylinder","body":"static|dynamic","position":[0,2,0],"size":[1,1,1],"color":"#RRGGBB","mass":2}],"goals":[{"id":"goal1","position":[2,1,0]}]}. Limits: 64 props, 16 goals, world coordinates -100..100, dimensions 0.1..20. Keep the player above ground. Use distinct ids. Do not claim photorealistic assets or scientific validity. User request:\n${prompt}`;
    return parseModelGameSpec(await model.generate(instruction, 4096));
}

/** Creates a new Godot project atomically; never overwrites an existing output. */
export function compileGameProject(specInput: unknown, outputDirectory: string): string {
    const spec = validateGameSpec(specInput);
    const output = path.resolve(outputDirectory);
    const parent = path.dirname(output);
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) throw new Error("Output parent directory does not exist");
    if (fs.existsSync(output)) throw new Error("Output directory already exists");
    const stage = path.join(parent, `.ruflo-game-${randomUUID()}`);
    fs.mkdirSync(stage, { recursive: false });
    try {
        const template = fileURLToPath(new URL("./godotGameRuntime.gd", import.meta.url));
        fs.copyFileSync(template, path.join(stage, "Main.gd"));
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
