/**
 * AEOS Agent Blueprint: Animation Agent
 * Discipline: Animation
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const AnimationAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_ANIMATION',
  name: 'Animation & Rigging Lead',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.ANIMATION,
  scope: [
    'skeleton creation',
    'rigging',
    'inverse kinematics',
    'blend trees',
    'locomotion systems',
    'procedural animation'
  ],
  tools: ['EMotionFXBridge', 'SkeletonBuilder', 'IKSolver', 'BlendTreeEditor'],
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
    constraints: ['Motion from simulation, not canned animations']
  }
};
