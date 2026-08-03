/**
 * AEOS Phase 1 - O3DE Subsystem Capability Registry
 * Indexes and exposes all 13 core O3DE subsystems into structured, validated tool interfaces.
 */

export interface SubsystemCapabilityEntry {
  capability: string;
  subsystem: string;
  toolFunctions: string[];
  category: 'NATIVE' | 'WRAPPABLE' | 'MISSING';
  description: string;
}

export class O3DECapabilityRegistry {
  private static instance: O3DECapabilityRegistry;
  private registry: Map<string, SubsystemCapabilityEntry> = new Map();

  private constructor() {
    this.registerCoreSubsystems();
  }

  public static getInstance(): O3DECapabilityRegistry {
    if (!O3DECapabilityRegistry.instance) {
      O3DECapabilityRegistry.instance = new O3DECapabilityRegistry();
    }
    return O3DECapabilityRegistry.instance;
  }

  public getCapability(capabilityName: string): SubsystemCapabilityEntry | undefined {
    return this.registry.get(capabilityName);
  }

  public getAllCapabilities(): SubsystemCapabilityEntry[] {
    return Array.from(this.registry.values());
  }

  private registerCoreSubsystems(): void {
    const entries: SubsystemCapabilityEntry[] = [
      {
        capability: 'Scene Management',
        subsystem: 'Scene System',
        toolFunctions: ['CreateScene()', 'LoadScene()', 'SaveScene()'],
        category: 'NATIVE',
        description: 'Creation, persistence, and serialization of O3DE scene graphs'
      },
      {
        capability: 'Entity Management',
        subsystem: 'Entity/Component',
        toolFunctions: ['CreateEntity()', 'DeleteEntity()', 'AddComponent()', 'RemoveComponent()'],
        category: 'NATIVE',
        description: 'AZ::Entity hierarchy, lifecycle, and component composition'
      },
      {
        capability: 'Prefabs',
        subsystem: 'Prefab System',
        toolFunctions: ['CreatePrefab()', 'InstantiatePrefab()', 'ModifyPrefab()'],
        category: 'NATIVE',
        description: 'Nested procedural prefabs and asset templates'
      },
      {
        capability: 'Rendering',
        subsystem: 'Atom Renderer',
        toolFunctions: ['SetMaterial()', 'ConfigureLighting()', 'BakeLighting()', 'CaptureFrame()'],
        category: 'NATIVE',
        description: 'Atom PBR multi-pass rendering, HDR lighting, and viewport capture'
      },
      {
        capability: 'Animation',
        subsystem: 'EMotionFX',
        toolFunctions: ['CreateSkeleton()', 'RigCharacter()', 'GenerateAnimation()', 'BlendAnimations()'],
        category: 'NATIVE',
        description: 'EMotionFX kinematic rigs, blend trees, and IK solvers'
      },
      {
        capability: 'Physics',
        subsystem: 'PhysX 5',
        toolFunctions: ['AddRigidBody()', 'ConfigureJoint()', 'SetCollisionLayer()', 'RunSimulation()'],
        category: 'NATIVE',
        description: 'NVIDIA PhysX 5 SDK rigid bodies, joints, and reduced coordinate articulations'
      },
      {
        capability: 'Terrain',
        subsystem: 'Terrain System',
        toolFunctions: ['GenerateTerrain()', 'SculptTerrain()', 'PaintTerrainMaterial()'],
        category: 'NATIVE',
        description: 'Gradient signals, heightmap sculptors, and macro surface textures'
      },
      {
        capability: 'Camera',
        subsystem: 'Camera System',
        toolFunctions: ['CreateCamera()', 'SetCameraTransform()', 'ConfigureDOF()'],
        category: 'NATIVE',
        description: 'Cinematic camera rigs, focal lengths, aperture, and depth of field'
      },
      {
        capability: 'Materials',
        subsystem: 'Material System',
        toolFunctions: ['CreateMaterial()', 'SetPBRProperties()', 'AssignMaterial()'],
        category: 'NATIVE',
        description: 'PBR Substrate material authoring (albedo, roughness, metallic, normal, anisotropy)'
      },
      {
        capability: 'Python Automation',
        subsystem: 'Editor Python Bindings',
        toolFunctions: ['ExecuteEditorCommand()', 'BatchProcess()'],
        category: 'NATIVE',
        description: 'AZ::BehaviorContext auto-marshaled Python scripting layer'
      },
      {
        capability: 'Asset Processing',
        subsystem: 'Asset Processor',
        toolFunctions: ['ImportAsset()', 'ProcessAsset()', 'ValidateAsset()'],
        category: 'NATIVE',
        description: 'Background asset compilation, validation, and LOD bundling'
      },
      {
        capability: 'Build & Test',
        subsystem: 'Build System',
        toolFunctions: ['Compile()', 'RunTests()', 'Commit()'],
        category: 'NATIVE',
        description: 'CMake build system and automated testing harness'
      },
      {
        capability: 'Profiling',
        subsystem: 'Performance Tools',
        toolFunctions: ['ProfilePerformance()', 'MeasureFPS()', 'MeasureMemory()'],
        category: 'NATIVE',
        description: 'Frame time, GPU timing, draw call counter, and VRAM memory tracker'
      }
    ];

    for (const entry of entries) {
      this.registry.set(entry.capability, entry);
    }
  }
}
