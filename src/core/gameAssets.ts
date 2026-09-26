import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export interface GameAsset {
    id: string;
    file: string;
    sha256: string;
    source: string;
    license: string;
}

export interface GameAssetCatalog { version: 1; assets: GameAsset[] }

const MAX_GLB_BYTES = 32 * 1024 * 1024;
const safeId = /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/u;
const digest = /^[0-9a-f]{64}$/u;

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Asset record must be an object");
    return value as Record<string, unknown>;
}

/** Operator-provided catalog; game-model output can reference IDs, never paths. */
export function validateGameAssetCatalog(value: unknown): GameAssetCatalog {
    const input = object(value);
    if (input.version !== 1 || !Array.isArray(input.assets) || input.assets.length > 32) {
        throw new Error("Unsupported or oversized asset catalog");
    }
    const ids = new Set<string>();
    const assets = input.assets.map((entry: unknown) => {
        const asset = object(entry);
        if (typeof asset.id !== "string" || !safeId.test(asset.id) || ids.has(asset.id)) {
            throw new Error("Asset IDs must be unique safe identifiers");
        }
        ids.add(asset.id);
        if (typeof asset.file !== "string" || !path.isAbsolute(asset.file)) {
            throw new Error("Asset file must be an explicit absolute path");
        }
        if (typeof asset.sha256 !== "string" || !digest.test(asset.sha256)) {
            throw new Error("Asset sha256 must be a lowercase SHA-256 digest");
        }
        if (typeof asset.source !== "string" || asset.source.length < 3 || asset.source.length > 500 || /[\r\n]/u.test(asset.source)) {
            throw new Error("Asset source provenance is required");
        }
        if (typeof asset.license !== "string" || asset.license.length < 2 || asset.license.length > 100 || /[\r\n]/u.test(asset.license)) {
            throw new Error("Asset license provenance is required");
        }
        return { id: asset.id, file: asset.file, sha256: asset.sha256, source: asset.source, license: asset.license };
    });
    return { version: 1, assets };
}

/** Validate the entire single-file container, not merely its `.glb` suffix. */
export function inspectSelfContainedGlb(data: Buffer): { meshes: number; materials: number } {
    if (data.length < 20 || data.length > MAX_GLB_BYTES || data.toString("ascii", 0, 4) !== "glTF"
        || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) {
        throw new Error("Invalid or oversized GLB 2.0 container");
    }
    let offset = 12;
    let document: Record<string, unknown> | undefined;
    let chunks = 0;
    while (offset < data.length) {
        if (offset + 8 > data.length) throw new Error("Truncated GLB chunk");
        const length = data.readUInt32LE(offset);
        const type = data.readUInt32LE(offset + 4);
        offset += 8;
        if (length % 4 !== 0 || offset + length > data.length) throw new Error("Invalid GLB chunk bounds");
        if (chunks === 0 && type === 0x4e4f534a) {
            try { document = object(JSON.parse(data.toString("utf8", offset, offset + length).trimEnd())); }
            catch { throw new Error("Invalid GLB JSON scene"); }
        } else if (chunks === 0 || (type !== 0x004e4942 && type !== 0x4e4f534a)) {
            throw new Error("Unexpected GLB chunk type");
        }
        chunks++;
        offset += length;
    }
    if (!document || object(document.asset).version !== "2.0" || !Array.isArray(document.meshes) || document.meshes.length === 0) {
        throw new Error("GLB must contain a glTF 2.0 mesh scene");
    }
    for (const collection of [document.buffers, document.images]) {
        if (collection === undefined) continue;
        if (!Array.isArray(collection)) throw new Error("Invalid GLB resource collection");
        for (const resource of collection) {
            if (object(resource).uri !== undefined) throw new Error("External GLB resources are forbidden");
        }
    }
    return { meshes: document.meshes.length, materials: Array.isArray(document.materials) ? document.materials.length : 0 };
}

export function readVerifiedGameAsset(asset: GameAsset): { data: Buffer; meshes: number; materials: number } {
    const stat = fs.lstatSync(asset.file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 20 || stat.size > MAX_GLB_BYTES) {
        throw new Error(`Asset ${asset.id} is not an admissible bounded regular file`);
    }
    const data = fs.readFileSync(asset.file);
    const actual = createHash("sha256").update(data).digest("hex");
    if (actual !== asset.sha256) throw new Error(`Asset ${asset.id} hash differs from catalog`);
    return { data, ...inspectSelfContainedGlb(data) };
}
