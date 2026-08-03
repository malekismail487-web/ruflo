/**
 * AEOS Phase 3 - Mandatory Agent Definitions
 * Implements the 10 core engineering specialist agents.
 */

import { AgentBlueprint, AgentType, EngineeringDiscipline, ActionPermission } from '../types';
import { AuthorityRegistry } from '../kernel/authority';

export interface AgentExecutionReport {
  agentId: string;
  discipline: string;
  actionTaken: string;
  status: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  artifactsGenerated: string[];
  metrics: Record<string, any>;
}

export class MandatoryAgentRegistry {
  private static instance: MandatoryAgentRegistry;
  private authority: AuthorityRegistry;
  private blueprints: Map<string, AgentBlueprint> = new Map();

  private constructor() {
    this.authority = AuthorityRegistry.getInstance();
    this.registerAllMandatoryAgents();
  }

  public static getInstance(): MandatoryAgentRegistry {
    if (!MandatoryAgentRegistry.instance) {
      MandatoryAgentRegistry.instance = new MandatoryAgentRegistry();
    }
    return MandatoryAgentRegistry.instance;
  }

  public getAgentBlueprint(name: string): AgentBlueprint | undefined {
    return this.blueprints.get(name);
  }

  public getAllMandatoryBlueprints(): AgentBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  private registerAllMandatoryAgents(): void {
    const rootId = this.authority.getRootAgentId();

    // 1. Master Orchestrator
    this.register({
      id: 'AGENT_MASTER_ORCHESTRATOR',
      name: 'Master Orchestrator',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.ORCHESTRATION,
      scope: ['Goal decomposition', 'Task scheduling', 'Conflict resolution', 'Result merging'],
      tools: ['TaskScheduler', 'DependencyGraph', 'ConflictResolver'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.WRITE_GLOBAL_LOG, ActionPermission.REQUEST_WORKERS, ActionPermission.EXECUTE_TOOL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 2. Physics Agent (PhysX 5 Specialist)
    this.register({
      id: 'AGENT_PHYSICS_SPECIALIST',
      name: 'Physics Lead (PhysX 5)',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.PHYSICS,
      scope: ['Rigid bodies', 'Articulations', 'Joints', 'Cloth', 'Vehicles', 'Stability'],
      tools: ['PhysX5Bridge', 'SimulationRunner', 'StabilityValidator'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.READ_FAMILY_LOG, ActionPermission.WRITE_FAMILY_LOG, ActionPermission.SUBMIT_PROPOSAL, ActionPermission.EXECUTE_TOOL, ActionPermission.EXECUTE_SIMULATION],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 3. Advisor Agent
    this.register({
      id: 'AGENT_ADVISOR',
      name: 'Architectural Advisor',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.ADVISORY,
      scope: ['Challenge assumptions', 'Detect overengineering', 'Identify missing systems', 'Assess risk'],
      tools: ['KnowledgeGraphQuery', 'RiskMatrix', 'ArchitectureAnalyzer'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.SUBMIT_PROPOSAL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 4. Validator Agent
    this.register({
      id: 'AGENT_VALIDATOR',
      name: 'Validator Lead',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.VALIDATION,
      scope: ['Compilation', 'Runtime execution', 'Memory leaks', 'Physics verification', 'Regression detection'],
      tools: ['Compiler', 'RuntimeValidator', 'MemoryProfiler', 'FrameDiffValidator'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.WRITE_GLOBAL_LOG, ActionPermission.EXECUTE_TOOL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 5. Geometry Agent
    this.register({
      id: 'AGENT_GEOMETRY',
      name: 'Geometry & Mesh Lead',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.GEOMETRY,
      scope: ['Procedural meshes', 'Topology analysis', 'LOD generation', 'UV mapping', 'Mesh repair'],
      tools: ['ProceduralMeshGenerator', 'TopologyAnalyzer', 'LODBuilder'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.READ_FAMILY_LOG, ActionPermission.WRITE_FAMILY_LOG, ActionPermission.SUBMIT_PROPOSAL, ActionPermission.EXECUTE_TOOL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 6. Animation Agent
    this.register({
      id: 'AGENT_ANIMATION',
      name: 'Animation & Rigging Lead',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.ANIMATION,
      scope: ['Skeletons', 'Rigging', 'Inverse Kinematics', 'EMotionFX blend trees', 'Procedural motion'],
      tools: ['EMotionFXBridge', 'IKSolver', 'SkeletonBuilder'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.READ_FAMILY_LOG, ActionPermission.WRITE_FAMILY_LOG, ActionPermission.SUBMIT_PROPOSAL, ActionPermission.EXECUTE_TOOL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 7. Rendering Agent
    this.register({
      id: 'AGENT_RENDERING',
      name: 'Rendering & Shading Lead',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.RENDERING,
      scope: ['PBR Substrate materials', 'Lighting', 'Atom renderer', 'Post-processing', 'Shadows'],
      tools: ['AtomMaterialEditor', 'LightingRig', 'CameraPostProcess'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.READ_FAMILY_LOG, ActionPermission.WRITE_FAMILY_LOG, ActionPermission.SUBMIT_PROPOSAL, ActionPermission.EXECUTE_TOOL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 8. Gameplay Agent
    this.register({
      id: 'AGENT_GAMEPLAY',
      name: 'Gameplay & Scripting Lead',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.GAMEPLAY,
      scope: ['Entities', 'Game rules', 'Interactions', 'Script Canvas', 'UI logic'],
      tools: ['EntityManager', 'ScriptCanvasEditor', 'InteractionGraph'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.READ_FAMILY_LOG, ActionPermission.WRITE_FAMILY_LOG, ActionPermission.SUBMIT_PROPOSAL, ActionPermission.EXECUTE_TOOL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 9. Performance Agent
    this.register({
      id: 'AGENT_PERFORMANCE',
      name: 'Performance Profiler Lead',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.PERFORMANCE,
      scope: ['Continuous profiling', 'FPS monitoring', 'Draw call optimization', 'Memory budgeting'],
      tools: ['ProfilerBridge', 'GPUFrameAnalyzer', 'MemoryTracker'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.READ_FAMILY_LOG, ActionPermission.EXECUTE_TOOL],
      parentId: rootId,
      createdAt: Date.now()
    });

    // 10. Research Agent (Read-Only)
    this.register({
      id: 'AGENT_RESEARCH',
      name: 'Research & Evidence Lead',
      type: AgentType.PARENT,
      discipline: EngineeringDiscipline.RESEARCH,
      scope: ['Documentation search', 'Academic papers', 'Algorithm comparison', 'Evidence gathering'],
      tools: ['LiteratureSearch', 'PaperDatabase', 'DocIndexer'],
      permissions: [ActionPermission.READ_GLOBAL_LOG, ActionPermission.READ_FAMILY_LOG, ActionPermission.WRITE_FAMILY_LOG],
      parentId: rootId,
      createdAt: Date.now()
    });
  }

  private register(blueprint: AgentBlueprint): void {
    this.blueprints.set(blueprint.id, blueprint);
    this.authority.registerAgent(blueprint);
  }
}
