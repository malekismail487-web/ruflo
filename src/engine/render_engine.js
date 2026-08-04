/**
 * Track A Render Engine: Cook-Torrance GGX Microfacet Shading Pipeline
 * Implements GGX NDF, Schlick Fresnel, Smith Visibility, and renders image artifacts.
 */

const fs = require('fs');

class PBRShader {
  constructor(roughness = 0.25, metallic = 0.85, albedo = [0.8, 0.85, 0.9]) {
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

    if (NdotL <= 0.0) return [0, 0, 0];

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
      Math.min(1.0, (diff[0] + spec[0]) * NdotL * lightIntensity),
      Math.min(1.0, (diff[1] + spec[1]) * NdotL * lightIntensity),
      Math.min(1.0, (diff[2] + spec[2]) * NdotL * lightIntensity)
    ];
  }
}

class SoftwareRenderer {
  static renderPBRPreview(width = 256, height = 256) {
    const shader = new PBRShader(0.2, 0.9, [0.85, 0.88, 0.92]);
    const lightDir = [0.577, 0.577, 0.577];
    const viewDir = [0.0, 0.0, 1.0];

    const pixelBuffer = Buffer.alloc(width * height * 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x / width) * 2 - 1;
        const ny = (1 - y / height) * 2 - 1;
        const distSq = nx * nx + ny * ny;

        let color = [0.05, 0.07, 0.1];

        if (distSq <= 0.75 * 0.75) {
          const nz = Math.sqrt(0.75 * 0.75 - distSq);
          const normal = [nx / 0.75, ny / 0.75, nz / 0.75];
          color = shader.shade(normal, lightDir, viewDir);
        }

        const idx = (y * width + x) * 3;
        pixelBuffer[idx] = Math.floor(color[2] * 255);
        pixelBuffer[idx + 1] = Math.floor(color[1] * 255);
        pixelBuffer[idx + 2] = Math.floor(color[0] * 255);
      }
    }

    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const pixelDataSize = width * height * 3;
    const fileSize = fileHeaderSize + infoHeaderSize + pixelDataSize;

    const bmpBuffer = Buffer.alloc(fileSize);

    bmpBuffer.write('BM', 0);
    bmpBuffer.writeUInt32LE(fileSize, 2);
    bmpBuffer.writeUInt32LE(fileHeaderSize + infoHeaderSize, 10);

    bmpBuffer.writeUInt32LE(infoHeaderSize, 14);
    bmpBuffer.writeInt32LE(width, 18);
    bmpBuffer.writeInt32LE(-height, 22);
    bmpBuffer.writeUInt16LE(1, 26);
    bmpBuffer.writeUInt16LE(24, 28);
    bmpBuffer.writeUInt32LE(0, 30);
    bmpBuffer.writeUInt32LE(pixelDataSize, 34);

    pixelBuffer.copy(bmpBuffer, fileHeaderSize + infoHeaderSize);

    return bmpBuffer;
  }
}

module.exports = { PBRShader, SoftwareRenderer };
