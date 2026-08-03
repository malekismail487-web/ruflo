/**
 * AEOS Agent Blueprint: Physics Parent Agent (PhysX 5 Specialist)
 * Discipline: Physics
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const PhysicsAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_PHYSICS_SPECIALIST',
  name: 'Physics Lead (PhysX 5)',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.PHYSICS,
  scope: [
    'rigid bodies',
    'joints',
    'cloth',
    'collision layers',
    'ragdolls',
    'vehicles',
    'character controllers',
    'stability analysis',
    'constraint configuration'
  ],
  tools: ['PhysX5Bridge', 'SimulationRunner', 'StabilityValidator'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.READ_FAMILY_LOG,
    ActionPermission.WRITE_FAMILY_LOG,
    ActionPermission.SUBMIT_PROPOSAL,
    ActionPermission.EXECUTE_TOOL,
    ActionPermission.EXECUTE_SIMULATION
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now(),
  metadata: {
    constraints: ['Reviews ALL motion-producing systems before validation']
  }
};
