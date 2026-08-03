/**
 * AEOS Agent Blueprint: Geometry Agent
 * Discipline: Geometry
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const GeometryAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_GEOMETRY',
  name: 'Geometry & Mesh Lead',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.GEOMETRY,
  scope: [
    'procedural mesh generation',
    'topology analysis and repair',
    'LOD generation',
    'UV unwrapping',
    'mesh optimization',
    'mesh repair'
  ],
  tools: ['MeshGenerator', 'TopologyAnalyzer', 'LODBuilder', 'UVUnwrapper'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.READ_FAMILY_LOG,
    ActionPermission.WRITE_FAMILY_LOG,
    ActionPermission.SUBMIT_PROPOSAL,
    ActionPermission.EXECUTE_TOOL
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now(),
  metadata: {
    constraints: [
      'ALL geometry is procedural — no asset library dependencies',
      'Output must meet Triple-A polygon density and topology standards',
      'NEVER produces simple primitive shapes as final output'
    ]
  }
};
