import fs from "node:fs";

export interface PngEvidence {
    valid: boolean;
    width?: number;
    height?: number;
    reason?: string;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
}

function crc32(bytes: Buffer): number {
    let value = 0xffffffff;
    for (const byte of bytes) value = table[(value ^ byte) & 0xff] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
}

/** Existence alone is not image evidence: reject markers, corrupt PNG chunks and stale outputs. */
export function inspectPngEvidence(filePath: string, startedAtMs = 0): PngEvidence {
    try {
        const stat = fs.lstatSync(filePath);
        if (!stat.isFile() || stat.isSymbolicLink()) return { valid: false, reason: "not_regular_file" };
        if (stat.size < 57 || stat.size > 100 * 1024 * 1024) return { valid: false, reason: "invalid_size" };
        if (stat.mtimeMs < startedAtMs - 1000) return { valid: false, reason: "stale_output" };
        const bytes = fs.readFileSync(filePath);
        if (!bytes.subarray(0, 8).equals(signature)) return { valid: false, reason: "invalid_signature" };
        let offset = 8;
        let width = 0;
        let height = 0;
        let sawIhdr = false;
        let sawIdat = false;
        let sawIend = false;
        while (offset + 12 <= bytes.length) {
            const length = bytes.readUInt32BE(offset);
            if (length > bytes.length - offset - 12) return { valid: false, reason: "truncated_chunk" };
            const type = bytes.toString("ascii", offset + 4, offset + 8);
            const end = offset + 12 + length;
            if (bytes.readUInt32BE(end - 4) !== crc32(bytes.subarray(offset + 4, end - 4))) {
                return { valid: false, reason: "crc_mismatch" };
            }
            if (!sawIhdr) {
                if (type !== "IHDR" || length !== 13) return { valid: false, reason: "missing_ihdr" };
                width = bytes.readUInt32BE(offset + 8);
                height = bytes.readUInt32BE(offset + 12);
                if (width < 1 || height < 1 || width > 16384 || height > 16384) {
                    return { valid: false, reason: "invalid_dimensions" };
                }
                sawIhdr = true;
            } else if (type === "IHDR") return { valid: false, reason: "duplicate_ihdr" };
            if (type === "IDAT" && length > 0) sawIdat = true;
            if (type === "IEND") {
                if (length !== 0 || !sawIdat || end !== bytes.length) {
                    return { valid: false, reason: "invalid_iend" };
                }
                sawIend = true;
                break;
            }
            offset = end;
        }
        return sawIhdr && sawIend ? { valid: true, width, height }
            : { valid: false, reason: "incomplete_png" };
    } catch {
        return { valid: false, reason: "unreadable_output" };
    }
}
