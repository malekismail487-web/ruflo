/**
 * Track A Render Engine: 3D Mesh PBR Rasterizer with Supersample Anti-Aliasing (SSAA)
 * 
 * 1. Projects actual 3D procedural engine mesh triangles (Block, Crankshaft, Pistons, Conrods).
 * 2. Z-Buffer depth testing for occlusion handling.
 * 3. Barycentric normal interpolation & Cook-Torrance GGX Microfacet Shading (GGX NDF + Schlick Fresnel + Smith Visibility).
 * 4. 4x Supersample Anti-Aliasing (SSAA) for smooth AAA-quality edges.
 */

const fs = require('fs');

class PBRShader {
  constructor(roughness = 0.25, metallic = 0.85, albedo = [0.8, 0.85, 0.92]) {
    this.alpha = Math.max(0.01, roughness * roughness);
    this.metallic = metallic;
    this.albedo = albedo;
  }

  distributionGGX(NdotH) {
    const a2 = this.alpha * this.alpha;
    const NdotH2 = NdotH * NdotH;
    const denom = NdotH2 * (a2 - 1.0) + 1.0;
    return a2 / (Math.PI * denom * denom);
  }

  visibilitySmith(NdotL, NdotV) {
    const a2 = this.alpha * this.alpha;
    const lambdaV = NdotL * Math.sqrt(a2 + (1.0 - a2) * NdotV * NdotV);
    const lambdaL = NdotV * Math.sqrt(a2 + (1.0 - a2) * NdotL * NdotL);
    return 0.5 / (lambdaV + lambdaL + 0.00001);
  }

  fresnelSchlick(VdotH, F0) {
    const powTerm = Math.pow(Math.max(0.0, 1.0 - VdotH), 5);
    return [
      F0[0] + (1.0 - F0[0]) * powTerm,
      F0[1] + (1.0 - F0[1]) * powTerm,
      F0[2] + (1.0 - F0[2]) * powTerm
    ];
  }

  shade(normal, lightDir, viewDir) {
    const N = normal;
    const L = lightDir;
    const V = viewDir;

    const H = [N[0] + L[0], N[1] + L[1], N[2] + L[2]];
    const hLen = Math.sqrt(H[0]*H[0] + H[1]*H[1] + H[2]*H[2]) || 1.0;
    H[0] /= hLen; H[1] /= hLen; H[2] /= hLen;

    const NdotL = Math.max(0.0, N[0]*L[0] + N[1]*L[1] + N[2]*L[2]);
    const NdotV = Math.max(0.0001, N[0]*V[0] + N[1]*V[1] + N[2]*V[2]);
    const NdotH = Math.max(0.0, N[0]*H[0] + N[1]*H[1] + N[2]*H[2]);
    const VdotH = Math.max(0.0, V[0]*H[0] + V[1]*H[1] + V[2]*H[2]);

    if (NdotL <= 0.0) return [0.03, 0.04, 0.06]; // Ambient shadow tint

    const F0 = [
      0.04 * (1 - this.metallic) + this.albedo[0] * this.metallic,
      0.04 * (1 - this.metallic) + this.albedo[1] * this.metallic,
      0.04 * (1 - this.metallic) + this.albedo[2] * this.metallic
    ];

    const D = this.distributionGGX(NdotH);
    const Vis = this.visibilitySmith(NdotL, NdotV);
    const F = this.fresnelSchlick(VdotH, F0);

    const spec = [D * Vis * F[0], D * Vis * F[1], D * Vis * F[2]];

    const kD = [
      (1.0 - F[0]) * (1.0 - this.metallic),
      (1.0 - F[1]) * (1.0 - this.metallic),
      (1.0 - F[2]) * (1.0 - this.metallic)
    ];

    const diff = [
      (kD[0] * this.albedo[0]) / Math.PI,
      (kD[1] * this.albedo[1]) / Math.PI,
      (kD[2] * this.albedo[2]) / Math.PI
    ];

    const lightIntensity = 3.5;
    return [
      Math.min(1.0, (diff[0] + spec[0]) * NdotL * lightIntensity + 0.05),
      Math.min(1.0, (diff[1] + spec[1]) * NdotL * lightIntensity + 0.06),
      Math.min(1.0, (diff[2] + spec[2]) * NdotL * lightIntensity + 0.08)
    ];
  }
}

class SoftwareRenderer {
  /**
   * Renders the actual 3D MeshData object with perspective camera, Z-buffering, PBR shading, and 4x SSAA
   */
  static renderMeshPBR(mesh, targetWidth = 512, targetHeight = 512, ssaaScale = 2) {
    const width = targetWidth * ssaaScale;
    const height = targetHeight * ssaaScale;

    const shader = new PBRShader(0.25, 0.85, [0.82, 0.85, 0.90]);
    const lightDir = [0.577, 0.707, 0.408];
    const viewDir = [0.0, 0.3, 0.95];

    // Initialize Z-Buffer and Frame Buffer
    const zBuffer = new Float32Array(width * height).fill(1e9);
    const frameBuffer = new Float32Array(width * height * 3).fill(0);

    // Set background color gradient (Dark Studio Environment)
    for (let y = 0; y < height; y++) {
      const grad = 0.05 + 0.08 * (1 - y / height);
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        frameBuffer[idx] = grad * 0.7;
        frameBuffer[idx + 1] = grad * 0.8;
        frameBuffer[idx + 2] = grad * 1.0;
      }
    }

    // Camera Perspective Parameters
    const camDist = 9.5;
    const fovScale = width * 0.85;

    function projectVertex(v) {
      // Rotate camera slightly (pitch down, yaw isometric)
      const cosY = Math.cos(0.45), sinY = Math.sin(0.45);
      const cosP = Math.cos(0.35), sinP = Math.sin(0.35);

      // World to Camera space
      let x1 = v[0] * cosY - v[2] * sinY;
      let z1 = v[0] * sinY + v[2] * cosY;
      let y1 = v[1];

      let y2 = y1 * cosP - z1 * sinP;
      let z2 = y1 * sinP + z1 * cosP + camDist;

      // Perspective Projection
      const px = (x1 / z2) * fovScale + width / 2;
      const py = (-y2 / z2) * fovScale + height / 2;

      return [px, py, z2];
    }

    // Rasterize all 3D triangles in mesh.faces
    for (const face of mesh.faces) {
      const v1Raw = mesh.vertices[face[0][0] - 1];
      const v2Raw = mesh.vertices[face[1][0] - 1];
      const v3Raw = mesh.vertices[face[2][0] - 1];

      const n1 = mesh.normals[face[0][2] - 1] || [0, 1, 0];
      const n2 = mesh.normals[face[1][2] - 1] || [0, 1, 0];
      const n3 = mesh.normals[face[2][2] - 1] || [0, 1, 0];

      const p1 = projectVertex(v1Raw);
      const p2 = projectVertex(v2Raw);
      const p3 = projectVertex(v3Raw);

      // Bounding box of triangle
      const minX = Math.max(0, Math.floor(Math.min(p1[0], p2[0], p3[0])));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(p1[0], p2[0], p3[0])));
      const minY = Math.max(0, Math.floor(Math.min(p1[1], p2[1], p3[1])));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(p1[1], p2[1], p3[1])));

      const denom = (p2[1] - p3[1]) * (p1[0] - p3[0]) + (p3[0] - p2[0]) * (p1[1] - p3[1]);
      if (Math.abs(denom) < 1e-6) continue;

      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const w1 = ((p2[1] - p3[1]) * (px - p3[0]) + (p3[0] - p2[0]) * (py - p3[1])) / denom;
          const w2 = ((p3[1] - p1[1]) * (px - p3[0]) + (p1[0] - p3[0]) * (py - p3[1])) / denom;
          const w3 = 1.0 - w1 - w2;

          if (w1 >= 0 && w2 >= 0 && w3 >= 0) {
            const depth = w1 * p1[2] + w2 * p2[2] + w3 * p3[2];
            const pIdx = py * width + px;

            if (depth < zBuffer[pIdx]) {
              zBuffer[pIdx] = depth;

              // Interpolate Normal
              const nx = w1 * n1[0] + w2 * n2[0] + w3 * n3[0];
              const ny = w1 * n1[1] + w2 * n2[1] + w3 * n3[1];
              const nz = w1 * n1[2] + w2 * n2[2] + w3 * n3[2];
              const normLen = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
              const normal = [nx / normLen, ny / normLen, nz / normLen];

              // PBR Shade
              const color = shader.shade(normal, lightDir, viewDir);

              const cIdx = pIdx * 3;
              frameBuffer[cIdx] = color[0];
              frameBuffer[cIdx + 1] = color[1];
              frameBuffer[cIdx + 2] = color[2];
            }
          }
        }
      }
    }

    // Downsample (4x SSAA Box Filter) from (width, height) to (targetWidth, targetHeight)
    const downsampledBuffer = Buffer.alloc(targetWidth * targetHeight * 3);
    const boxSize = ssaaScale * ssaaScale;

    for (let ty = 0; ty < targetHeight; ty++) {
      for (let tx = 0; tx < targetWidth; tx++) {
        let rAcc = 0, gAcc = 0, bAcc = 0;

        for (let sy = 0; sy < ssaaScale; sy++) {
          for (let sx = 0; sx < ssaaScale; sx++) {
            const py = ty * ssaaScale + sy;
            const px = tx * ssaaScale + sx;
            const cIdx = (py * width + px) * 3;

            rAcc += frameBuffer[cIdx];
            gAcc += frameBuffer[cIdx + 1];
            bAcc += frameBuffer[cIdx + 2];
          }
        }

        const outIdx = (ty * targetWidth + tx) * 3;
        downsampledBuffer[outIdx] = Math.floor((rAcc / boxSize) * 255);     // R
        downsampledBuffer[outIdx + 1] = Math.floor((gAcc / boxSize) * 255); // G
        downsampledBuffer[outIdx + 2] = Math.floor((bAcc / boxSize) * 255); // B
      }
    }

    return downsampledBuffer;
  }
}

module.exports = { PBRShader, SoftwareRenderer };
