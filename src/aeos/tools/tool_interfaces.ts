/**
 * AEOS Tool Layer - AI "Hands"
 * Structured, validated tool interfaces exposed to specialist agents.
 * Ensures agents never modify raw engine files directly.
 */

import { UUID } from '../types';

export interface EntityHandle {
  entityId: string;
  name: string;
  parentId?: string;
  components: string[];
}

export interface ComponentHandle {
  componentId: string;
  typeId: string;
  entityId: string;
  properties: Record<string, any>;
}

export interface ProceduralMeshSpec {
  name: string;
  primitiveType: 'CYLINDER' | 'PISTON_HEAD' | 'CONNECTING_ROD' | 'CRANKSHAFT_WEB' | 'ENGINE_BLOCK' | 'CUSTOM_SURFACE';
  dimensions: Record<string, number>;
  topology: {
    radialSegments: number;
    heightSegments: number;
    subdivisionLevel: number;
    bevelRadiusMm?: number;
  };
  materialId?: string;
}

export interface PBRMaterialSpec {
  materialId: string;
  baseColorHex: string;
  metallic: number;    // 0.0 to 1.0
  roughness: number;   // 0.0 to 1.0
  normalStrength: number;
  anisotropy?: number;
  clearcoat?: number;
}

export interface PhysX5RigidBodySpec {
  entityId: string;
  massKg: number;
  isKinematic: boolean;
  gravityEnabled: boolean;
  linearDamping: number;
  angularDamping: number;
  collisionLayer: string;
}

export interface PhysX5JointSpec {
  type: 'FIXED' | 'BALL' | 'HINGE_REVOLUTE' | 'PRISMATIC' | 'D6' | 'ARTICULATION_REDUCED_COORDINATE';
  bodyAEntityId: string;
  bodyBEntityId: string;
  localAnchorA: [number, number, number];
  localAnchorB: [number, number, number];
  jointLimits?: { min: number; max: number };
  breakForce?: number;
  driveVelocity?: number;
  driveMaxForce?: number;
}

export class O3DEToolBridge {
  private static instance: O3DEToolBridge;
  private entities: Map<string, EntityHandle> = new Map();
  private components: Map<string, ComponentHandle> = new Map();
  private meshes: Map<string, ProceduralMeshSpec> = new Map();
  private materials: Map<string, PBRMaterialSpec> = new Map();
  private joints: PhysX5JointSpec[] = [];

  private constructor() {}

  public static getInstance(): O3DEToolBridge {
    if (!O3DEToolBridge.instance) {
      O3DEToolBridge.instance = new O3DEToolBridge();
    }
    return O3DEToolBridge.instance;
  }

  // --- Entity Management ---
  public createEntity(name: string, parentId?: string): EntityHandle {
    const entityId = `ENTITY_${name.toUpperCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const handle: EntityHandle = {
      entityId,
      name,
      parentId,
      components: []
    };
    this.entities.set(entityId, handle);
    return handle;
  }

  public deleteEntity(entityId: string): boolean {
    return this.entities.delete(entityId);
  }

  public addComponent(entityId: string, typeId: string, properties: Record<string, any> = {}): ComponentHandle {
    const entity = this.entities.get(entityId);
    if (!entity) throw new Error(`Entity ${entityId} not found.`);

    const componentId = `COMP_${typeId}_${Date.now()}`;
    const handle: ComponentHandle = {
      componentId,
      typeId,
      entityId,
      properties
    };

    this.components.set(componentId, handle);
    entity.components.push(componentId);
    return handle;
  }

  // --- Procedural Geometry ---
  public generateProceduralMesh(spec: ProceduralMeshSpec): { meshAssetId: string; vertexCount: number; triangleCount: number } {
    const meshAssetId = `ASSET_MESH_${spec.name}_${Date.now()}`;
    this.meshes.set(meshAssetId, spec);

    // Compute topology metrics based on procedural specifications
    const rad = spec.topology.radialSegments || 32;
    const hgt = spec.topology.heightSegments || 16;
    const vertexCount = (rad + 1) * (hgt + 1) * Math.pow(2, spec.topology.subdivisionLevel || 0);
    const triangleCount = rad * hgt * 2 * Math.pow(4, spec.topology.subdivisionLevel || 0);

    return { meshAssetId, vertexCount, triangleCount };
  }

  // --- Atom Rendering & Materials ---
  public createPBRMaterial(spec: PBRMaterialSpec): string {
    this.materials.set(spec.materialId, spec);
    return spec.materialId;
  }

  // --- PhysX 5 Physics & Articulations ---
  public configureRigidBody(spec: PhysX5RigidBodySpec): void {
    const entity = this.entities.get(spec.entityId);
    if (!entity) throw new Error(`Entity ${spec.entityId} not found.`);

    this.addComponent(spec.entityId, 'PhysX::RigidBodyComponent', spec);
  }

  public createJoint(spec: PhysX5JointSpec): PhysX5JointSpec {
    this.joints.push(spec);
    return spec;
  }

  public getEntities(): EntityHandle[] {
    return Array.from(this.entities.values());
  }

  public getJoints(): PhysX5JointSpec[] {
    return [...this.joints];
  }
}
