/**
 * AEOS Kernel - Engineering Knowledge Graph
 * Stores functional relationships, physical constraints, kinematic hierarchies, and engineering rules.
 * Enables reasoning over how complex mechanical and physical systems work.
 */

import {
  EngineeringRule,
  KnowledgeNode,
  KnowledgeRelationship,
  RelationshipType
} from '../types';

export class EngineeringKnowledgeGraph {
  private static instance: EngineeringKnowledgeGraph;
  private nodes: Map<string, KnowledgeNode> = new Map();
  private relationships: KnowledgeRelationship[] = [];
  private rules: Map<string, EngineeringRule> = new Map();

  private constructor() {
    this.seedBaselineEngineeringRules();
    this.seedBaselineMechanicalAssemblies();
  }

  public static getInstance(): EngineeringKnowledgeGraph {
    if (!EngineeringKnowledgeGraph.instance) {
      EngineeringKnowledgeGraph.instance = new EngineeringKnowledgeGraph();
    }
    return EngineeringKnowledgeGraph.instance;
  }

  public addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
  }

  public getNode(nodeId: string): KnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  public addRelationship(
    fromNodeId: string,
    toNodeId: string,
    type: RelationshipType,
    parameters?: Record<string, any>
  ): void {
    if (!this.nodes.has(fromNodeId)) throw new Error(`Source node ${fromNodeId} not found in Knowledge Graph.`);
    if (!this.nodes.has(toNodeId)) throw new Error(`Target node ${toNodeId} not found in Knowledge Graph.`);

    this.relationships.push({ fromNodeId, toNodeId, type, parameters });
  }

  public getOutboundRelationships(nodeId: string, type?: RelationshipType): KnowledgeRelationship[] {
    return this.relationships.filter(
      r => r.fromNodeId === nodeId && (type ? r.type === type : true)
    );
  }

  public getInboundRelationships(nodeId: string, type?: RelationshipType): KnowledgeRelationship[] {
    return this.relationships.filter(
      r => r.toNodeId === nodeId && (type ? r.type === type : true)
    );
  }

  /**
   * Recursively resolves the engineering decomposition hierarchy for an assembly.
   */
  public resolveDecompositionTree(rootNodeId: string): {
    root: KnowledgeNode;
    children: Array<{ node: KnowledgeNode; relationship: RelationshipType; params?: any; subtree: any }>;
  } {
    const root = this.nodes.get(rootNodeId);
    if (!root) throw new Error(`Node ${rootNodeId} not found.`);

    const containsRelations = this.getOutboundRelationships(rootNodeId, RelationshipType.CONTAINS);
    const children = containsRelations.map(rel => {
      const childNode = this.nodes.get(rel.toNodeId)!;
      return {
        node: childNode,
        relationship: rel.type,
        params: rel.parameters,
        subtree: this.resolveDecompositionTree(childNode.id)
      };
    });

    return { root, children };
  }

  /**
   * Validates engineering constraints and rules for a node.
   */
  public validateEngineeringRules(nodeId: string, contextParams: Record<string, any> = {}): {
    valid: boolean;
    violations: string[];
  } {
    const node = this.nodes.get(nodeId);
    if (!node) return { valid: false, violations: [`Node ${nodeId} not found`] };

    const violations: string[] = [];
    if (node.engineeringRules) {
      for (const ruleId of node.engineeringRules) {
        const rule = this.rules.get(ruleId);
        if (rule) {
          const evalResult = rule.validator({ node, ...contextParams });
          if (!evalResult.valid) {
            violations.push(`[Rule: ${rule.name}] ${evalResult.reason || 'Failed constraint check'}`);
          }
        }
      }
    }

    return { valid: violations.length === 0, violations };
  }

  public registerRule(rule: EngineeringRule): void {
    this.rules.set(rule.id, rule);
  }

  private seedBaselineEngineeringRules(): void {
    this.registerRule({
      id: 'RULE_PHYSX_MASS_POSITIVE',
      name: 'Positive Mass Constraint',
      description: 'Physical rigid bodies must have non-zero positive mass in kg.',
      validator: ({ node }) => {
        if (node.physics && (node.physics.massKg === undefined || node.physics.massKg <= 0)) {
          return { valid: false, reason: `Mass must be positive number (> 0 kg), got ${node.physics?.massKg}` };
        }
        return { valid: true };
      }
    });

    this.registerRule({
      id: 'RULE_REVOLUTE_JOINT_LIMITS',
      name: 'Revolute Joint Limit Sanity',
      description: 'Revolute joint limits must have min <= max within valid angular range.',
      validator: ({ node }) => {
        if (node.physics?.jointType === 'REVOLUTE' && node.physics.jointLimits) {
          const { min, max } = node.physics.jointLimits;
          if (min > max) return { valid: false, reason: `Joint min (${min}) cannot exceed max (${max})` };
        }
        return { valid: true };
      }
    });
  }

  private seedBaselineMechanicalAssemblies(): void {
    // Seed Four-Cylinder Engine Assembly in Knowledge Graph
    const engineRoot: KnowledgeNode = {
      id: 'ASSEMBLY_FOUR_CYLINDER_ENGINE',
      type: 'InternalCombustionEngine',
      category: 'ASSEMBLY',
      metadata: { displacementLiters: 2.0, configuration: 'Inline-4', firingOrder: [1, 3, 4, 2] }
    };
    this.addNode(engineRoot);

    const engineBlock: KnowledgeNode = {
      id: 'COMP_ENGINE_BLOCK',
      type: 'EngineBlock',
      category: 'COMPONENT',
      geometry: {
        proceduralGenerator: 'ProceduralEngineBlockGenerator',
        parameters: { cylinders: 4, boreDiameterMm: 85, strokeMm: 88 }
      },
      physics: { massKg: 45.0, friction: 0.6, restitution: 0.1 },
      engineeringRules: ['RULE_PHYSX_MASS_POSITIVE']
    };
    this.addNode(engineBlock);
    this.addRelationship(engineRoot.id, engineBlock.id, RelationshipType.CONTAINS);

    const crankshaft: KnowledgeNode = {
      id: 'COMP_CRANKSHAFT',
      type: 'Crankshaft',
      category: 'COMPONENT',
      geometry: {
        proceduralGenerator: 'ProceduralCrankshaftGenerator',
        parameters: { journals: 5, crankPins: 4, throwOffsetMm: 44 }
      },
      physics: {
        massKg: 16.5,
        jointType: 'REVOLUTE',
        jointLimits: { min: -Infinity, max: Infinity }
      },
      engineeringRules: ['RULE_PHYSX_MASS_POSITIVE', 'RULE_REVOLUTE_JOINT_LIMITS']
    };
    this.addNode(crankshaft);
    this.addRelationship(engineRoot.id, crankshaft.id, RelationshipType.CONTAINS);
    this.addRelationship(crankshaft.id, engineBlock.id, RelationshipType.CONNECTS_TO, { joint: 'MainBearingsRevolute' });

    // Pistons & Connecting Rods for 4 Cylinders
    for (let i = 1; i <= 4; i++) {
      const pistonId = `COMP_PISTON_CYL_${i}`;
      const conrodId = `COMP_CONROD_CYL_${i}`;

      const piston: KnowledgeNode = {
        id: pistonId,
        type: 'PistonAssembly',
        category: 'COMPONENT',
        geometry: {
          proceduralGenerator: 'ProceduralPistonGenerator',
          parameters: { diameterMm: 84.95, compressionHeightMm: 32 }
        },
        physics: {
          massKg: 0.48,
          jointType: 'PRISMATIC',
          jointLimits: { min: -44, max: 44 }
        },
        engineeringRules: ['RULE_PHYSX_MASS_POSITIVE']
      };
      this.addNode(piston);
      this.addRelationship(engineRoot.id, piston.id, RelationshipType.CONTAINS);
      this.addRelationship(piston.id, engineBlock.id, RelationshipType.CONSTRAINS, { type: 'CylinderBoreSlider' });

      const conrod: KnowledgeNode = {
        id: conrodId,
        type: 'ConnectingRod',
        category: 'COMPONENT',
        geometry: {
          proceduralGenerator: 'ProceduralConnectingRodGenerator',
          parameters: { centerToCenterLengthMm: 142, bigEndDiameterMm: 52, smallEndDiameterMm: 22 }
        },
        physics: { massKg: 0.62, jointType: 'REVOLUTE' },
        engineeringRules: ['RULE_PHYSX_MASS_POSITIVE']
      };
      this.addNode(conrod);
      this.addRelationship(engineRoot.id, conrod.id, RelationshipType.CONTAINS);
      this.addRelationship(conrod.id, crankshaft.id, RelationshipType.CONNECTS_TO, { joint: 'CrankPinJournal', pinIndex: i });
      this.addRelationship(conrod.id, piston.id, RelationshipType.CONNECTS_TO, { joint: 'WristPinRevolute' });
      this.addRelationship(crankshaft.id, piston.id, RelationshipType.DRIVES, { kinematicEquation: 'SliderCrankMechanism' });
    }
  }
}
