import { createHash } from "node:crypto";

export type Vec3 = [number, number, number];

export type GeometryNode =
    | { kind: "sphere"; radius: number }
    | { kind: "box"; halfSize: Vec3; roundness: number }
    | { kind: "cylinder"; radius: number; halfHeight: number }
    | { kind: "torus"; majorRadius: number; minorRadius: number }
    | { kind: "union" | "intersection" | "subtract"; left: GeometryNode; right: GeometryNode }
    | { kind: "smoothUnion"; radius: number; left: GeometryNode; right: GeometryNode }
    | { kind: "translate"; offset: Vec3; child: GeometryNode }
    | { kind: "rotateY"; degrees: number; child: GeometryNode }
    | { kind: "scale"; factor: number; child: GeometryNode }
    | { kind: "radialArray"; count: number; radius: number; child: GeometryNode };

export interface GeometryRecipe { id: string; resolution: number; color: string; metallic: number; roughness: number; root: GeometryNode }
export interface GeneratedGeometry { data: Buffer; sha256: string; recipeSha256: string; triangles: number; vertices: number; bounds: { min: Vec3; max: Vec3 } }

const ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/u;
const HEX = /^#[0-9a-fA-F]{6}$/u;
const MAX_NODES = 48;
const MAX_DEPTH = 12;
const MAX_TRIANGLES = 180_000;
const DOMAIN = 1.1;

function object(input: unknown, name: string): Record<string, unknown> {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error(`${name} must be an object`);
    return input as Record<string, unknown>;
}

function number(input: unknown, name: string, min: number, max: number): number {
    if (typeof input !== "number" || !Number.isFinite(input) || input < min || input > max) {
        throw new Error(`${name} must be finite and within [${min}, ${max}]`);
    }
    return input;
}

function vec3(input: unknown, name: string, min: number, max: number): Vec3 {
    if (!Array.isArray(input) || input.length !== 3) throw new Error(`${name} must be three coordinates`);
    return [number(input[0], `${name}.x`, min, max), number(input[1], `${name}.y`, min, max), number(input[2], `${name}.z`, min, max)];
}

/** The model supplies a bounded mathematical design, never executable code or paths. */
export function validateGeometryRecipe(input: unknown): GeometryRecipe {
    const recipe = object(input, "geometry recipe");
    if (typeof recipe.id !== "string" || !ID.test(recipe.id)) throw new Error("Geometry id must be safe");
    if (typeof recipe.color !== "string" || !HEX.test(recipe.color)) throw new Error("Geometry color must be #RRGGBB");
    const budget = { nodes: 0 };
    function node(inputNode: unknown, depth: number): GeometryNode {
        const n = object(inputNode, "geometry node");
        if (++budget.nodes > MAX_NODES || depth > MAX_DEPTH) throw new Error("Geometry graph exceeds node/depth budget");
        switch (n.kind) {
            case "sphere": return { kind: "sphere", radius: number(n.radius, "sphere.radius", 0.025, 0.95) };
            case "box": return { kind: "box", halfSize: vec3(n.halfSize, "box.halfSize", 0.025, 0.95),
                roundness: number(n.roundness, "box.roundness", 0, 0.2) };
            case "cylinder": return { kind: "cylinder", radius: number(n.radius, "cylinder.radius", 0.025, 0.95),
                halfHeight: number(n.halfHeight, "cylinder.halfHeight", 0.025, 0.95) };
            case "torus": {
                const majorRadius = number(n.majorRadius, "torus.majorRadius", 0.05, 0.9);
                const minorRadius = number(n.minorRadius, "torus.minorRadius", 0.02, 0.35);
                if (majorRadius + minorRadius > 0.98) throw new Error("Torus exceeds geometry envelope");
                return { kind: "torus", majorRadius, minorRadius };
            }
            case "union":
            case "intersection":
            case "subtract":
                return { kind: n.kind, left: node(n.left, depth + 1), right: node(n.right, depth + 1) };
            case "smoothUnion": return { kind: "smoothUnion", radius: number(n.radius, "smoothUnion.radius", 0.01, 0.3),
                left: node(n.left, depth + 1), right: node(n.right, depth + 1) };
            case "translate": return { kind: "translate", offset: vec3(n.offset, "translate.offset", -0.95, 0.95),
                child: node(n.child, depth + 1) };
            case "rotateY": return { kind: "rotateY", degrees: number(n.degrees, "rotateY.degrees", -360, 360),
                child: node(n.child, depth + 1) };
            case "scale": return { kind: "scale", factor: number(n.factor, "scale.factor", 0.05, 2),
                child: node(n.child, depth + 1) };
            case "radialArray": {
                const count = number(n.count, "radialArray.count", 2, 24);
                if (!Number.isInteger(count)) throw new Error("radialArray.count must be an integer");
                return { kind: "radialArray", count, radius: number(n.radius, "radialArray.radius", 0, 0.9),
                    child: node(n.child, depth + 1) };
            }
            default: throw new Error(`Unsupported geometry node: ${String(n.kind)}`);
        }
    }
    const root = node(recipe.root, 1);
    function cost(n: GeometryNode): number {
        switch (n.kind) {
            case "union": case "intersection": case "subtract": case "smoothUnion": return cost(n.left) + cost(n.right) + 1;
            case "radialArray": return n.count * cost(n.child) + 1;
            case "translate": case "rotateY": case "scale": return cost(n.child) + 1;
            default: return 1;
        }
    }
    if (cost(root) > 128) throw new Error("Geometry graph exceeds evaluation budget");
    const resolution = number(recipe.resolution, "resolution", 20, 72);
    if (!Number.isInteger(resolution)) throw new Error("resolution must be an integer");
    return { id: recipe.id, resolution, color: recipe.color,
        metallic: number(recipe.metallic, "metallic", 0, 1), roughness: number(recipe.roughness, "roughness", 0.05, 1),
        root };
}

function distance(n: GeometryNode, x: number, y: number, z: number): number {
    switch (n.kind) {
        case "sphere": return Math.hypot(x, y, z) - n.radius;
        case "box": {
            const qx = Math.abs(x) - n.halfSize[0], qy = Math.abs(y) - n.halfSize[1], qz = Math.abs(z) - n.halfSize[2];
            return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0))
                + Math.min(Math.max(qx, qy, qz), 0) - n.roundness;
        }
        case "cylinder": {
            const radial = Math.hypot(x, z) - n.radius, vertical = Math.abs(y) - n.halfHeight;
            return Math.min(Math.max(radial, vertical), 0) + Math.hypot(Math.max(radial, 0), Math.max(vertical, 0));
        }
        case "torus": return Math.hypot(Math.hypot(x, z) - n.majorRadius, y) - n.minorRadius;
        case "union": return Math.min(distance(n.left, x, y, z), distance(n.right, x, y, z));
        case "intersection": return Math.max(distance(n.left, x, y, z), distance(n.right, x, y, z));
        case "subtract": return Math.max(distance(n.left, x, y, z), -distance(n.right, x, y, z));
        case "smoothUnion": {
            const a = distance(n.left, x, y, z), b = distance(n.right, x, y, z);
            const h = Math.max(n.radius - Math.abs(a - b), 0) / n.radius;
            return Math.min(a, b) - h * h * n.radius * 0.25;
        }
        case "translate": return distance(n.child, x - n.offset[0], y - n.offset[1], z - n.offset[2]);
        case "rotateY": {
            const angle = n.degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
            return distance(n.child, c * x - s * z, y, s * x + c * z);
        }
        case "scale": return distance(n.child, x / n.factor, y / n.factor, z / n.factor) * n.factor;
        case "radialArray": {
            let d = Infinity;
            for (let i = 0; i < n.count; i++) {
                const angle = 2 * Math.PI * i / n.count, c = Math.cos(angle), s = Math.sin(angle);
                d = Math.min(d, distance(n.child, c * x + s * z - n.radius, y, -s * x + c * z));
            }
            return d;
        }
    }
}

interface Vertex { p: Vec3; n: Vec3 }
const CUBE_CORNERS: ReadonlyArray<Vec3> = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const TETRAHEDRA = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]] as const;

function align4(data: Buffer, pad = 0): Buffer {
    const extra = (4 - data.length % 4) % 4;
    return extra === 0 ? data : Buffer.concat([data, Buffer.alloc(extra, pad)]);
}

function glb(positions: Float32Array, normals: Float32Array, recipe: GeometryRecipe, min: Vec3, max: Vec3): Buffer {
    const pos = Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength);
    const normal = Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength);
    const binary = align4(Buffer.concat([pos, normal]));
    const rgb = [1, 3, 5].map(start => parseInt(recipe.color.slice(start, start + 2), 16) / 255);
    const document = {
        asset: { version: "2.0", generator: "NYX bounded procedural geometry v1" },
        scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: recipe.id }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0, mode: 4 }] }],
        materials: [{ pbrMetallicRoughness: { baseColorFactor: [...rgb, 1], metallicFactor: recipe.metallic,
            roughnessFactor: recipe.roughness }, doubleSided: false }],
        buffers: [{ byteLength: binary.length }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.length, target: 34962 },
            { buffer: 0, byteOffset: pos.length, byteLength: normal.length, target: 34962 }],
        accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min, max },
            { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" }],
    };
    const json = align4(Buffer.from(JSON.stringify(document), "utf8"), 0x20);
    const out = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
    out.write("glTF", 0, "ascii"); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
    out.writeUInt32LE(json.length, 12); out.writeUInt32LE(0x4e4f534a, 16); json.copy(out, 20);
    const binHeader = 20 + json.length;
    out.writeUInt32LE(binary.length, binHeader); out.writeUInt32LE(0x004e4942, binHeader + 4);
    binary.copy(out, binHeader + 8);
    return out;
}

/** Samples a signed-distance design and extracts a real triangle mesh; no external asset is consulted. */
export function generateGeometry(input: unknown): GeneratedGeometry {
    const recipe = validateGeometryRecipe(input);
    const cells = recipe.resolution, side = cells + 1, strideY = side, strideZ = side * side;
    const step = 2 * DOMAIN / cells, count = side * side * side;
    const values = new Float32Array(count), gradients = new Float32Array(count * 3);
    const index = (x: number, y: number, z: number): number => x + y * strideY + z * strideZ;
    for (let z = 0; z <= cells; z++) for (let y = 0; y <= cells; y++) for (let x = 0; x <= cells; x++) {
        const d = distance(recipe.root, -DOMAIN + x * step, -DOMAIN + y * step, -DOMAIN + z * step);
        if (!Number.isFinite(d)) throw new Error("Geometry distance field became non-finite");
        if ((x === 0 || y === 0 || z === 0 || x === cells || y === cells || z === cells) && d <= 0) {
            throw new Error("Geometry exits its bounded sampling domain");
        }
        values[index(x, y, z)] = d;
    }
    for (let z = 0; z <= cells; z++) for (let y = 0; y <= cells; y++) for (let x = 0; x <= cells; x++) {
        const at = index(x, y, z) * 3;
        gradients[at] = values[index(Math.min(x + 1, cells), y, z)] - values[index(Math.max(x - 1, 0), y, z)];
        gradients[at + 1] = values[index(x, Math.min(y + 1, cells), z)] - values[index(x, Math.max(y - 1, 0), z)];
        gradients[at + 2] = values[index(x, y, Math.min(z + 1, cells))] - values[index(x, y, Math.max(z - 1, 0))];
    }
    const pos: number[] = [], normal: number[] = [];
    const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
    function vertex(a: number, b: number, xyz: Map<number, Vec3>): Vertex {
        const da = values[a], db = values[b], t = da / (da - db);
        const pa = xyz.get(a)!, pb = xyz.get(b)!;
        const p: Vec3 = [0, 1, 2].map(axis => pa[axis] + (pb[axis] - pa[axis]) * t) as Vec3;
        const gx = gradients[a * 3] + (gradients[b * 3] - gradients[a * 3]) * t;
        const gy = gradients[a * 3 + 1] + (gradients[b * 3 + 1] - gradients[a * 3 + 1]) * t;
        const gz = gradients[a * 3 + 2] + (gradients[b * 3 + 2] - gradients[a * 3 + 2]) * t;
        const length = Math.hypot(gx, gy, gz) || 1;
        return { p, n: [gx / length, gy / length, gz / length] };
    }
    function triangle(a: Vertex, b: Vertex, c: Vertex): void {
        const ab = [b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]];
        const ac = [c.p[0] - a.p[0], c.p[1] - a.p[1], c.p[2] - a.p[2]];
        const cross: Vec3 = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        if (Math.hypot(...cross) < 1e-9) return;
        if (cross[0] * a.n[0] + cross[1] * a.n[1] + cross[2] * a.n[2] < 0) [b, c] = [c, b];
        if (pos.length / 9 >= MAX_TRIANGLES) throw new Error("Generated geometry exceeds triangle budget");
        for (const v of [a, b, c]) {
            for (let axis = 0; axis < 3; axis++) {
                min[axis] = Math.min(min[axis], v.p[axis]); max[axis] = Math.max(max[axis], v.p[axis]);
                pos.push(v.p[axis]); normal.push(v.n[axis]);
            }
        }
    }
    for (let z = 0; z < cells; z++) for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
        const ids = CUBE_CORNERS.map(c => index(x + c[0], y + c[1], z + c[2]));
        let negative = false, positive = false;
        for (const id of ids) { if (values[id] < 0) negative = true; else positive = true; }
        if (!negative || !positive) continue;
        const xyz = new Map<number, Vec3>();
        for (const id of ids) {
            const iz = Math.floor(id / strideZ), iy = Math.floor((id - iz * strideZ) / strideY), ix = id % strideY;
            xyz.set(id, [-DOMAIN + ix * step, -DOMAIN + iy * step, -DOMAIN + iz * step]);
        }
        for (const tetra of TETRAHEDRA) {
            const inside = tetra.map(i => ids[i]).filter(i => values[i] < 0);
            if (inside.length === 0 || inside.length === 4) continue;
            const outside = tetra.map(i => ids[i]).filter(i => values[i] >= 0);
            if (inside.length === 1) triangle(...outside.map(o => vertex(inside[0], o, xyz)) as [Vertex, Vertex, Vertex]);
            else if (outside.length === 1) triangle(...inside.map(i => vertex(i, outside[0], xyz)) as [Vertex, Vertex, Vertex]);
            else {
                const a = vertex(inside[0], outside[0], xyz), b = vertex(inside[0], outside[1], xyz);
                const c = vertex(inside[1], outside[0], xyz), d = vertex(inside[1], outside[1], xyz);
                triangle(a, b, d); triangle(a, d, c);
            }
        }
    }
    if (pos.length < 9) throw new Error("Geometry graph produced no visible surface");
    const data = glb(Float32Array.from(pos), Float32Array.from(normal), recipe, min, max);
    if (data.length > 32 * 1024 * 1024) throw new Error("Generated GLB exceeds asset byte budget");
    return { data, sha256: createHash("sha256").update(data).digest("hex"),
        recipeSha256: createHash("sha256").update(JSON.stringify(recipe)).digest("hex"),
        triangles: pos.length / 9, vertices: pos.length / 3, bounds: { min, max } };
}
