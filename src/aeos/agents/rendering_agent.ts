/**
 * AEOS Agent Blueprint: Rendering Agent
 * Discipline: Rendering
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const RenderingAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_RENDERING',
  name: 'Rendering & Shading Lead',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.RENDERING,
  scope: [
    'PBR material authoring',
    'lighting configuration',
    'shadow setup',
    'camera management',
    'post-processing pipeline',
    'Atom renderer configuration'
  ],
  tools: ['AtomRenderer', 'MaterialEditor', 'LightingSystem', 'PostProcessStack'],
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
    constraints: ['Output must meet photorealistic Triple-A standards']
  }
};
