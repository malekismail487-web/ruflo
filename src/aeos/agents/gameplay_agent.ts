/**
 * AEOS Agent Blueprint: Gameplay Agent
 * Discipline: Gameplay
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const GameplayAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_GAMEPLAY',
  name: 'Gameplay & Scripting Lead',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.GAMEPLAY,
  scope: [
    'entity management',
    'game rule implementation',
    'interaction systems',
    'UI logic',
    'Script Canvas scripting'
  ],
  tools: ['EntityManager', 'ScriptCanvas', 'UIFramework', 'InteractionSystem'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.READ_FAMILY_LOG,
    ActionPermission.WRITE_FAMILY_LOG,
    ActionPermission.SUBMIT_PROPOSAL,
    ActionPermission.EXECUTE_TOOL
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now()
};
