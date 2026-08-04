/**
 * Track A Render Engine: 3D Mesh PBR Rasterizer with Gamma-Corrected SSAA
 * 
 * 1. Projects full 3D procedural engine assembly (Block Shell, Cylinders, Pistons, Connecting Rods, Crankshaft).
 * 2. Z-Buffer depth testing for occlusion handling.
 * 3. Barycentric normal interpolation & Cook-Torrance GGX Microfacet Specular Shading.
 * 4. Gamma-Corrected 4x SSAA (512x512 with 2x subpixel resolution) for silky smooth AAA-quality anti-aliased edges.
 */

const fs = require('fs');

class PBRShader {
  constructor(roughness = 0.22, metallic = 0.88, albedo = [0.85, 0.88, 0.94]) {
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

    if (NdotL <= 0.0) return [0.04, 0.05, 0.08]; // Studio ambient fill

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

    const lightIntensity = 3.6;
    return [
      Math.min(1.0, (diff[0] + spec[0]) * NdotL * lightIntensity + 0.05),
      Math.min(1.0, (diff[1] + spec[1]) * NdotL * lightIntensity + 0.06),
      Math.min(1.0, (diff[2] + spec[2]) * NdotL * lightIntensity + 0.08)
    ];
  }
}

class SoftwareRenderer {
  /**
   * Renders complete 3D Mesh Assembly with Isometric Camera Framing, Z-buffering, PBR shading, and Gamma-Corrected 4x SSAA
   */
  static renderMeshPBR(mesh, targetWidth = 512, targetHeight = 512, ssaaScale = 2) {
    const width = targetWidth * ssaaScale;
    const height = targetHeight * ssaaScale;

    const shader = new PBRShader(0.22, 0.88, [0.85, 0.88, 0.94]);
    const lightDir = [0.577, 0.707, 0.408];
    const viewDir = [0.0, 0.4, 0.91];

    const zBuffer = new Float32Array(width * height).fill(1e9);
    const frameBuffer = new Float32Array(width * height * 3).fill(0);

    // Studio Background Gradient
    for (let y = 0; y < height; y++) {
      const grad = 0.04 + 0.09 * (1 - y / height);
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        frameBuffer[idx] = grad * 0.7;
        frameBuffer[idx + 1] = grad * 0.85;
        frameBuffer[idx + 2] = grad * 1.1;
      }
    }

    // Isometric Camera Framing to fit full assembly
    const camDist = 13.0;
    const fovScale = width * 0.95;

    function projectVertex(v) {
      // Rotation: Yaw 0.60 rad (~34 deg), Pitch 0.40 rad (~23 deg)
      const cosY = Math.cos(0.60), sinY = Math.sin(0.60);
      const cosP = Math.cos(0.40), sinP = Math.sin(0.40);

      let x1 = v[0] * cosY - v[2] * sinY;
      let z1 = v[0] * sinY + v[2] * cosY;
      let y1 = v[1];

      let y2 = y1 * cosP - z1 * sinP;
      let z2 = y1 * sinP + z1 * cosP + camDist;

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

              const nx = w1 * n1[0] + w2 * n2[0] + w3 * n3[0];
              const ny = w1 * n1[1] + w2 * n2[1] + w3 * n3[1];
              const nz = w1 * n1[2] + w2 * n2[2] + w3 * n3[2];
              const normLen = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
              const normal = [nx / normLen, ny / normLen, nz / normLen];

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

    // Downsample with Gamma Correction (sRGB gamma = 2.2) & SSAA Box Filtering
    const downsampledBuffer = Buffer.alloc(targetWidth * targetHeight * 3);
    const boxSize = ssaaScale * ssaaScale;
    const invGamma = 1.0 / 2.2;

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

        const rLin = rAcc / boxSize;
        const gLin = gAcc / boxSize;
        const bLin = bAcc / boxSize;

        // Apply Gamma Correction (sRGB conversion) for smooth anti-aliased edge transitions
        const rGamma = Math.pow(Math.min(1.0, Math.max(0.0, rLin)), invGamma);
        const gGamma = Math.pow(Math.min(1.0, Math.max(0.0, gLin)), invGamma);
        const bGamma = Math.pow(Math.min(1.0, Math.max(0.0, bLin)), invGamma);

        const outIdx = (ty * targetWidth + tx) * 3;
        downsampledBuffer[outIdx] = Math.floor(rGamma * 255);     // R
        downsampledBuffer[outIdx + 1] = Math.floor(gGamma * 255); // G
        downsampledBuffer[outIdx + 2] = Math.floor(bGamma * 255); // B
      }
    }

    return downsampledBuffer;
  }
}

module.exports = { PBRShader, SoftwareRenderer };
