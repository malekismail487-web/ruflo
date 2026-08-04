/**
 * Track A Engine Core: Procedural 3D Mesh Synthesis Engine
 * Generates hard-surface quad-dominant 3D meshes with curvature subdivisions and exportable topology.
 */

class MeshData {
  constructor(name) {
    this.name = name;
    this.vertices = [];
    this.normals = [];
    this.uvs = [];
    this.faces = [];
  }

  addVertex(x, y, z) {
    this.vertices.push([x, y, z]);
    return this.vertices.length;
  }

  addNormal(nx, ny, nz) {
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    this.normals.push([nx / len, ny / len, nz / len]);
    return this.normals.length;
  }

  addUV(u, v) {
    this.uvs.push([u, v]);
    return this.uvs.length;
  }

  addQuadFace(v1, v2, v3, v4, nIdx) {
    this.faces.push([
      [v1, v1, nIdx],
      [v2, v2, nIdx],
      [v3, v3, nIdx]
    ]);
    this.faces.push([
      [v1, v1, nIdx],
      [v3, v3, nIdx],
      [v4, v4, nIdx]
    ]);
  }
}

class ProceduralEngineGenerator {
  static generateFourCylinderEngine(boreRadius = 0.85, strokeLength = 0.88, cylinders = 4) {
    const mesh = new MeshData("FourCylinderEngineAssembly");

    const blockWidth = cylinders * 2.2;
    const blockHeight = 3.5;
    const blockDepth = 2.4;

    const bX = blockWidth / 2;
    const bY = blockHeight / 2;

    for (let c = 0; c < cylinders; c++) {
      const cX = -blockWidth / 2 + 1.1 + c * 2.2;
      const segments = 32;

      for (let s = 0; s < segments; s++) {
        const theta1 = (s / segments) * Math.PI * 2;
        const theta2 = ((s + 1) / segments) * Math.PI * 2;

        const cos1 = Math.cos(theta1), sin1 = Math.sin(theta1);
        const cos2 = Math.cos(theta2), sin2 = Math.sin(theta2);

        const v1 = mesh.addVertex(cX + boreRadius * cos1, -bY, boreRadius * sin1);
        const v2 = mesh.addVertex(cX + boreRadius * cos2, -bY, boreRadius * sin2);
        const v3 = mesh.addVertex(cX + boreRadius * cos2, bY, boreRadius * sin2);
        const v4 = mesh.addVertex(cX + boreRadius * cos1, bY, boreRadius * sin1);

        mesh.addUV(s / segments, 0);
        mesh.addUV((s + 1) / segments, 0);
        mesh.addUV((s + 1) / segments, 1);
        mesh.addUV(s / segments, 1);

        const nIdx = mesh.addNormal(-cos1, 0, -sin1);
        mesh.addQuadFace(v1, v2, v3, v4, nIdx);
      }

      const pistonY = (c % 2 === 0) ? 0.6 : -0.6;
      for (let s = 0; s < segments; s++) {
        const theta1 = (s / segments) * Math.PI * 2;
        const theta2 = ((s + 1) / segments) * Math.PI * 2;

        const cos1 = Math.cos(theta1), sin1 = Math.sin(theta1);
        const cos2 = Math.cos(theta2), sin2 = Math.sin(theta2);

        const pRadius = boreRadius * 0.96;
        const pHeight = 0.6;

        const pv1 = mesh.addVertex(cX + pRadius * cos1, pistonY + pHeight / 2, pRadius * sin1);
        const pv2 = mesh.addVertex(cX + pRadius * cos2, pistonY + pHeight / 2, pRadius * sin2);
        const pvCenter = mesh.addVertex(cX, pistonY + pHeight / 2, 0);

        mesh.addUV(0, 0); mesh.addUV(1, 0); mesh.addUV(0.5, 1);
        const topNormal = mesh.addNormal(0, 1, 0);
        mesh.faces.push([
          [pv1, pv1, topNormal],
          [pv2, pv2, topNormal],
          [pvCenter, pvCenter, topNormal]
        ]);
      }
    }

    const shaftRadius = 0.35;
    const shaftSegments = 24;
    for (let s = 0; s < shaftSegments; s++) {
      const t1 = (s / shaftSegments) * Math.PI * 2;
      const t2 = ((s + 1) / shaftSegments) * Math.PI * 2;
      const cos1 = Math.cos(t1), sin1 = Math.sin(t1);
      const cos2 = Math.cos(t2), sin2 = Math.sin(t2);

      const sv1 = mesh.addVertex(-bX - 0.5, shaftRadius * cos1 - 1.2, shaftRadius * sin1);
      const sv2 = mesh.addVertex(-bX - 0.5, shaftRadius * cos2 - 1.2, shaftRadius * sin2);
      const sv3 = mesh.addVertex(bX + 0.5, shaftRadius * cos2 - 1.2, shaftRadius * sin2);
      const sv4 = mesh.addVertex(bX + 0.5, shaftRadius * cos1 - 1.2, shaftRadius * sin1);

      mesh.addUV(s / shaftSegments, 0);
      mesh.addUV((s + 1) / shaftSegments, 0);
      mesh.addUV((s + 1) / shaftSegments, 1);
      mesh.addUV(s / shaftSegments, 1);

      const nIdx = mesh.addNormal(0, cos1, sin1);
      mesh.addQuadFace(sv1, sv2, sv3, sv4, nIdx);
    }

    return mesh;
  }

  static exportToOBJ(mesh) {
    let obj = `# Wavefront OBJ - Track A Procedural Generator\n`;
    obj += `o ${mesh.name}\n\n`;

    for (const v of mesh.vertices) {
      obj += `v ${v[0].toFixed(6)} ${v[1].toFixed(6)} ${v[2].toFixed(6)}\n`;
    }

    for (const vt of mesh.uvs) {
      obj += `vt ${vt[0].toFixed(6)} ${vt[1].toFixed(6)}\n`;
    }

    for (const vn of mesh.normals) {
      obj += `vn ${vn[0].toFixed(6)} ${vn[1].toFixed(6)} ${vn[2].toFixed(6)}\n`;
    }

    obj += `\ns off\n`;
    for (const f of mesh.faces) {
      obj += `f`;
      for (const idx of f) {
        obj += ` ${idx[0]}/${idx[1]}/${idx[2]}`;
      }
      obj += `\n`;
    }

    return obj;
  }
}

module.exports = { MeshData, ProceduralEngineGenerator };
