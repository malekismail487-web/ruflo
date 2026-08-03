/**
 * AEOS Kernel - Capability Discovery Engine
 * Automatically scans, classifies (Native, Wrappable, Missing), and registers engine subsystems.
 */

export enum CapabilityCategory {
  NATIVE = 'NATIVE',       // Already exposed via existing Python / C++ bindings
  WRAPPABLE = 'WRAPPABLE', // Available in engine C++ subsystems, requires wrapper interface
  MISSING = 'MISSING'      // Not available in engine, requires custom implementation
}

export interface EngineCapability {
  capabilityId: string;
  subsystem: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  toolSignature: string;
  supportedModes: Array<'INTERACTIVE' | 'HEADLESS'>;
}

export class CapabilityDiscoveryScanner {
  private static instance: CapabilityDiscoveryScanner;
  private capabilities: Map<string, EngineCapability> = new Map();

  private constructor() {
    this.seedBaselineO3DECapabilities();
  }

  public static getInstance(): CapabilityDiscoveryScanner {
    if (!CapabilityDiscoveryScanner.instance) {
      CapabilityDiscoveryScanner.instance = new CapabilityDiscoveryScanner();
    }
    return CapabilityDiscoveryScanner.instance;
  }

  public registerCapability(cap: EngineCapability): void {
    this.capabilities.set(cap.capabilityId, cap);
  }

  public getCapability(id: string): EngineCapability | undefined {
    return this.capabilities.get(id);
  }

  public getAllCapabilities(): EngineCapability[] {
    return Array.from(this.capabilities.values());
  }

  public getCapabilitiesByCategory(category: CapabilityCategory): EngineCapability[] {
    return Array.from(this.capabilities.values()).filter(c => c.category === category);
  }

  private seedBaselineO3DECapabilities(): void {
    // Scene & Entity Management (Native)
    this.registerCapability({
      capabilityId: 'CAP_SCENE_CREATE',
      subsystem: 'AzToolsFramework::Scene',
      name: 'CreateScene',
      description: 'Creates a new empty O3DE scene container',
      category: CapabilityCategory.NATIVE,
      toolSignature: 'CreateScene(sceneName: string): SceneHandle',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });

    this.registerCapability({
      capabilityId: 'CAP_ENTITY_CREATE',
      subsystem: 'AzFramework::Entity',
      name: 'CreateEntity',
      description: 'Creates a new entity in current scene',
      category: CapabilityCategory.NATIVE,
      toolSignature: 'CreateEntity(name: string, parentId?: EntityId): EntityId',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });

    this.registerCapability({
      capabilityId: 'CAP_COMPONENT_ADD',
      subsystem: 'AzFramework::Component',
      name: 'AddComponent',
      description: 'Attaches an engine component to an entity',
      category: CapabilityCategory.NATIVE,
      toolSignature: 'AddComponent(entityId: EntityId, componentTypeId: string, config: object): ComponentHandle',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });

    // PhysX Simulation (Native / Wrappable)
    this.registerCapability({
      capabilityId: 'CAP_PHYSX_RIGID_BODY',
      subsystem: 'PhysX::RigidBodyComponent',
      name: 'AddRigidBody',
      description: 'Configures mass, inertia, and dynamic rigid body simulation',
      category: CapabilityCategory.NATIVE,
      toolSignature: 'AddRigidBody(entityId: EntityId, massKg: number, isKinematic: boolean): void',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });

    this.registerCapability({
      capabilityId: 'CAP_PHYSX_JOINT',
      subsystem: 'PhysX::JointComponent',
      name: 'ConfigureJoint',
      description: 'Creates kinematic and physical joint constraints (Revolute, Prismatic, D6)',
      category: CapabilityCategory.NATIVE,
      toolSignature: 'ConfigureJoint(type: JointType, bodyA: EntityId, bodyB: EntityId, limits: JointLimits): JointHandle',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });

    // Atom Renderer (Native / Wrappable)
    this.registerCapability({
      capabilityId: 'CAP_ATOM_MATERIAL_SET',
      subsystem: 'Atom::MaterialComponent',
      name: 'SetMaterial',
      description: 'Assigns PBR Substrate materials with metallic, roughness, and normal maps',
      category: CapabilityCategory.NATIVE,
      toolSignature: 'SetMaterial(entityId: EntityId, materialAssetPath: string): void',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });

    this.registerCapability({
      capabilityId: 'CAP_ATOM_FRAME_CAPTURE',
      subsystem: 'Atom::RenderPipeline',
      name: 'CaptureFrame',
      description: 'Renders the viewport to an image buffer / artifact',
      category: CapabilityCategory.NATIVE,
      toolSignature: 'CaptureFrame(resolutionWidth: number, resolutionHeight: number): Buffer',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });

    // Procedural Mesh Generation (Wrappable / Extension)
    this.registerCapability({
      capabilityId: 'CAP_PROCEDURAL_MESH_GENERATE',
      subsystem: 'AzCore::ProceduralGeometry',
      name: 'GenerateMesh',
      description: 'Procedurally generates high-density topology meshes without asset library reliance',
      category: CapabilityCategory.WRAPPABLE,
      toolSignature: 'GenerateMesh(spec: ProceduralMeshSpec): MeshAssetHandle',
      supportedModes: ['INTERACTIVE', 'HEADLESS']
    });
  }
}
