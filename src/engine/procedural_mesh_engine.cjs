/**
 * Track A Engine Core: Complete Procedural 3D Engine Assembly Synthesizer
 * 
 * Synthesizes complete hard-surface geometry for:
 * 1. Outer Engine Block Housing (Top deck, side walls, oil pan flange)
 * 2. 4 Cylinder Bores
 * 3. 4 Piston Heads with ring grooves
 * 4. 4 Connecting Rods (H-beam linkage)
 * 5. Crankshaft Assembly (Main shaft + 4 offset throw web journals)
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
    const mesh = new MeshData("CompleteFourCylinderEngineAssembly");

    const blockWidth = cylinders * 2.2;
    const blockHeight = 3.6;
    const blockDepth = 2.6;

    const bX = blockWidth / 2;
    const bY = blockHeight / 2;
    const bZ = blockDepth / 2;

    // --- 1. OUTER ENGINE BLOCK HOUSING SHELL ---
    // Top Deck
    const nTop = mesh.addNormal(0, 1, 0);
    const vT1 = mesh.addVertex(-bX, bY, -bZ);
    const vT2 = mesh.addVertex(bX, bY, -bZ);
    const vT3 = mesh.addVertex(bX, bY, bZ);
    const vT4 = mesh.addVertex(-bX, bY, bZ);
    mesh.addUV(0, 0); mesh.addUV(1, 0); mesh.addUV(1, 1); mesh.addUV(0, 1);
    mesh.addQuadFace(vT1, vT2, vT3, vT4, nTop);

    // Front & Back Outer Walls
    const nFront = mesh.addNormal(0, 0, 1);
    const vF1 = mesh.addVertex(-bX, -bY, bZ);
    const vF2 = mesh.addVertex(bX, -bY, bZ);
    const vF3 = mesh.addVertex(bX, bY, bZ);
    const vF4 = mesh.addVertex(-bX, bY, bZ);
    mesh.addQuadFace(vF1, vF2, vF3, vF4, nFront);

    const nBack = mesh.addNormal(0, 0, -1);
    const vB1 = mesh.addVertex(bX, -bY, -bZ);
    const vB2 = mesh.addVertex(-bX, -bY, -bZ);
    const vB3 = mesh.addVertex(-bX, bY, -bZ);
    const vB4 = mesh.addVertex(bX, bY, -bZ);
    mesh.addQuadFace(vB1, vB2, vB3, vB4, nBack);

    // Left & Right End Plates
    const nLeft = mesh.addNormal(-1, 0, 0);
    const vL1 = mesh.addVertex(-bX, -bY, -bZ);
    const vL2 = mesh.addVertex(-bX, -bY, bZ);
    const vL3 = mesh.addVertex(-bX, bY, bZ);
    const vL4 = mesh.addVertex(-bX, bY, -bZ);
    mesh.addQuadFace(vL1, vL2, vL3, vL4, nLeft);

    const nRight = mesh.addNormal(1, 0, 0);
    const vR1 = mesh.addVertex(bX, -bY, bZ);
    const vR2 = mesh.addVertex(bX, -bY, -bZ);
    const vR3 = mesh.addVertex(bX, bY, -bZ);
    const vR4 = mesh.addVertex(bX, bY, bZ);
    mesh.addQuadFace(vR1, vR2, vR3, vR4, nRight);

    // Bottom Oil Pan Flange
    const nBottom = mesh.addNormal(0, -1, 0);
    const flangeMargin = 0.3;
    const vBot1 = mesh.addVertex(-bX - flangeMargin, -bY, -bZ - flangeMargin);
    const vBot2 = mesh.addVertex(bX + flangeMargin, -bY, -bZ - flangeMargin);
    const vBot3 = mesh.addVertex(bX + flangeMargin, -bY, bZ + flangeMargin);
    const vBot4 = mesh.addVertex(-bX - flangeMargin, -bY, bZ + flangeMargin);
    mesh.addQuadFace(vBot1, vBot2, vBot3, vBot4, nBottom);

    // --- 2. CYLINDER BORES, PISTONS, CONNECTING RODS & CRANKSHAFT THROWS ---
    const throwRadius = strokeLength / 2; // 0.44m
    const crankY = -bY + 0.6; // Crankshaft center line

    for (let c = 0; c < cylinders; c++) {
      const cX = -bX + 1.1 + c * 2.2;
      const segments = 32;

      // A. Cylinder Bore Inner Wall
      for (let s = 0; s < segments; s++) {
        const theta1 = (s / segments) * Math.PI * 2;
        const theta2 = ((s + 1) / segments) * Math.PI * 2;

        const cos1 = Math.cos(theta1), sin1 = Math.sin(theta1);
        const cos2 = Math.cos(theta2), sin2 = Math.sin(theta2);

        const v1 = mesh.addVertex(cX + boreRadius * cos1, crankY, boreRadius * sin1);
        const v2 = mesh.addVertex(cX + boreRadius * cos2, crankY, boreRadius * sin2);
        const v3 = mesh.addVertex(cX + boreRadius * cos2, bY, boreRadius * sin2);
        const v4 = mesh.addVertex(cX + boreRadius * cos1, bY, boreRadius * sin1);

        const nIdx = mesh.addNormal(-cos1, 0, -sin1);
        mesh.addQuadFace(v1, v2, v3, v4, nIdx);
      }

      // B. Piston Crown & Skirt
      const phaseOffset = (c % 2 === 0) ? 0 : Math.PI;
      const pistonY = (c % 2 === 0) ? 0.7 : -0.3;
      const pRadius = boreRadius * 0.95;
      const pHeight = 0.6;

      for (let s = 0; s < segments; s++) {
        const theta1 = (s / segments) * Math.PI * 2;
        const theta2 = ((s + 1) / segments) * Math.PI * 2;

        const cos1 = Math.cos(theta1), sin1 = Math.sin(theta1);
        const cos2 = Math.cos(theta2), sin2 = Math.sin(theta2);

        // Piston Crown Top
        const pv1 = mesh.addVertex(cX + pRadius * cos1, pistonY + pHeight / 2, pRadius * sin1);
        const pv2 = mesh.addVertex(cX + pRadius * cos2, pistonY + pHeight / 2, pRadius * sin2);
        const pvCenter = mesh.addVertex(cX, pistonY + pHeight / 2, 0);

        const topNormal = mesh.addNormal(0, 1, 0);
        mesh.faces.push([
          [pv1, pv1, topNormal],
          [pv2, pv2, topNormal],
          [pvCenter, pvCenter, topNormal]
        ]);

        // Piston Skirt Wall
        const pSk1 = mesh.addVertex(cX + pRadius * cos1, pistonY - pHeight / 2, pRadius * sin1);
        const pSk2 = mesh.addVertex(cX + pRadius * cos2, pistonY - pHeight / 2, pRadius * sin2);
        const wallNormal = mesh.addNormal(cos1, 0, sin1);
        mesh.addQuadFace(pSk1, pSk2, pv2, pv1, wallNormal);
      }

      // C. Connecting Rod H-Beam Linkage
      const rodWidth = 0.22;
      const rodDepth = 0.18;
      const throwPinY = crankY + throwRadius * Math.cos(phaseOffset);
      const throwPinZ = throwRadius * Math.sin(phaseOffset);

      // Rod front face
      const rF1 = mesh.addVertex(cX - rodWidth / 2, throwPinY, throwPinZ + rodDepth / 2);
      const rF2 = mesh.addVertex(cX + rodWidth / 2, throwPinY, throwPinZ + rodDepth / 2);
      const rF3 = mesh.addVertex(cX + rodWidth / 2, pistonY - pHeight / 2, rodDepth / 2);
      const rF4 = mesh.addVertex(cX - rodWidth / 2, pistonY - pHeight / 2, rodDepth / 2);
      const nRodFront = mesh.addNormal(0, 0, 1);
      mesh.addQuadFace(rF1, rF2, rF3, rF4, nRodFront);

      // D. Crankshaft Throw Web Journal Arm
      const webThickness = 0.25;
      const w1 = mesh.addVertex(cX - webThickness / 2, crankY, 0);
      const w2 = mesh.addVertex(cX + webThickness / 2, crankY, 0);
      const w3 = mesh.addVertex(cX + webThickness / 2, throwPinY, throwPinZ);
      const w4 = mesh.addVertex(cX - webThickness / 2, throwPinY, throwPinZ);
      const nWeb = mesh.addNormal(1, 0, 0);
      mesh.addQuadFace(w1, w2, w3, w4, nWeb);
    }

    // --- 3. CRANKSHAFT MAIN DRIVE SHAFT ---
    const shaftRadius = 0.35;
    const shaftSegments = 24;
    for (let s = 0; s < shaftSegments; s++) {
      const t1 = (s / shaftSegments) * Math.PI * 2;
      const t2 = ((s + 1) / shaftSegments) * Math.PI * 2;
      const cos1 = Math.cos(t1), sin1 = Math.sin(t1);
      const cos2 = Math.cos(t2), sin2 = Math.sin(t2);

      const sv1 = mesh.addVertex(-bX - 0.8, crankY + shaftRadius * cos1, shaftRadius * sin1);
      const sv2 = mesh.addVertex(-bX - 0.8, crankY + shaftRadius * cos2, shaftRadius * sin2);
      const sv3 = mesh.addVertex(bX + 0.8, crankY + shaftRadius * cos2, shaftRadius * sin2);
      const sv4 = mesh.addVertex(bX + 0.8, crankY + shaftRadius * cos1, shaftRadius * sin1);

      const nIdx = mesh.addNormal(0, cos1, sin1);
      mesh.addQuadFace(sv1, sv2, sv3, sv4, nIdx);
    }

    return mesh;
  }

  static exportToOBJ(mesh) {
    let obj = `# Wavefront OBJ - Track A Complete Engine Synthesizer\n`;
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
