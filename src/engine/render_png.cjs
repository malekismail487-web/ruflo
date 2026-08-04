/**
 * Node.js Native PNG Renderer & Exporter for Actual 3D Engine Mesh
 * 
 * Rasterizes the actual 3D Four-Cylinder Engine Assembly mesh with 4x SSAA anti-aliasing and saves PNG directly to Brain Artifacts directory.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { ProceduralEngineGenerator } = require('./procedural_mesh_engine.cjs');
const { SoftwareRenderer } = require('./render_engine.cjs');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcVal = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function renderMeshToPNG(mesh, targetWidth = 512, targetHeight = 512) {
  // Render mesh with 4x SSAA (512x512 with 2x scale)
  const rgbPixels = SoftwareRenderer.renderMeshPBR(mesh, targetWidth, targetHeight, 2);

  const rawRows = [];
  for (let y = 0; y < targetHeight; y++) {
    const row = Buffer.alloc(1 + targetWidth * 3);
    row[0] = 0; // Filter type 0

    for (let x = 0; x < targetWidth; x++) {
      const inIdx = (y * targetWidth + x) * 3;
      const outIdx = 1 + x * 3;

      row[outIdx] = rgbPixels[inIdx];         // R
      row[outIdx + 1] = rgbPixels[inIdx + 1]; // G
      row[outIdx + 2] = rgbPixels[inIdx + 2]; // B
    }
    rawRows.push(row);
  }

  const rawBuffer = Buffer.concat(rawRows);
  const compressedData = zlib.deflateSync(rawBuffer);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(targetWidth, 0);
  header.writeUInt32BE(targetHeight, 4);
  header[8] = 8;  // Bit depth 8
  header[9] = 2;  // Color type 2 (RGB)
  header[10] = 0; // Compression
  header[11] = 0; // Filter
  header[12] = 0; // Interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = writeChunk('IHDR', header);
  const idatChunk = writeChunk('IDAT', compressedData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Generate Actual 4-Cylinder Engine Assembly Mesh
const engineMesh = ProceduralEngineGenerator.generateFourCylinderEngine(0.85, 0.88, 4);

// 2. Render to PNG with 4x SSAA
const brainPngPath = 'C:\\Users\\loka3\\.gemini\\antigravity\\brain\\483ba762-e84a-4312-968c-bd33efab9845\\engine_pbr_preview.png';
const pngBuf = renderMeshToPNG(engineMesh, 512, 512);
fs.writeFileSync(brainPngPath, pngBuf);

console.log("=========================================================================");
console.log("  3D ENGINE MESH PBR RENDER COMPLETE (WITH 4x SSAA ANTI-ALIASING)         ");
console.log("=========================================================================");
console.log(` -> Rendered Mesh Assembly: ${engineMesh.name}`);
console.log(` -> Triangle Vertices Rendered: ${engineMesh.vertices.length}`);
console.log(` -> Polygonal Faces Rendered: ${engineMesh.faces.length}`);
console.log(` -> Output Image Path: ${brainPngPath}`);
console.log(` -> Resolution: 512 x 512 pixels (4x SSAA Anti-Aliased)`);
console.log(` -> PNG File Size: ${fs.statSync(brainPngPath).size} bytes`);
