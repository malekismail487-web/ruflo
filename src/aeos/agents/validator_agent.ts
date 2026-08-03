/**
 * AEOS Agent Blueprint: Validator Agent
 * Discipline: Validation
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const ValidatorAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_VALIDATOR',
  name: 'Validator Lead',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.VALIDATION,
  scope: [
    'compilation verification',
    'runtime execution verification',
    'memory leak detection',
    'crash detection',
    'rendering correctness',
    'physics correctness',
    'performance regression',
    'regression detection'
  ],
  tools: ['Compiler', 'RuntimeExecutor', 'MemoryProfiler', 'RenderCapture', 'PhysicsValidator'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.WRITE_GLOBAL_LOG,
    ActionPermission.EXECUTE_TOOL
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now(),
  metadata: {
    constraints: [
      'Nothing enters the project without Validator approval',
      'Returns EVIDENCE, never guesses',
      'Every failure includes: reproduction steps, logs, metrics, screenshots'
    ]
  }
};
