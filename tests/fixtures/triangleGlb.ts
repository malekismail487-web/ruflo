/** Tiny self-contained mesh for deterministic importer and confinement tests. */
export function triangleGlb(extra: Record<string, unknown> = {}): Buffer {
    const geometry = Buffer.alloc(36);
    for (const [index, value] of [0, 0, 0, 1, 0, 0, 0, 1, 0].entries()) geometry.writeFloatLE(value, index * 4);
    const document = {
        asset: { version: "2.0", generator: "NYX deterministic test fixture" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ byteLength: geometry.length }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: geometry.length }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
        ...extra,
    };
    const json = Buffer.from(JSON.stringify(document), "utf8");
    const paddedJson = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
    const total = 12 + 8 + paddedJson.length + 8 + geometry.length;
    const glb = Buffer.alloc(total);
    glb.write("glTF", 0, "ascii");
    glb.writeUInt32LE(2, 4);
    glb.writeUInt32LE(total, 8);
    glb.writeUInt32LE(paddedJson.length, 12);
    glb.writeUInt32LE(0x4e4f534a, 16);
    paddedJson.copy(glb, 20);
    const binaryHeader = 20 + paddedJson.length;
    glb.writeUInt32LE(geometry.length, binaryHeader);
    glb.writeUInt32LE(0x004e4942, binaryHeader + 4);
    geometry.copy(glb, binaryHeader + 8);
    return glb;
}
