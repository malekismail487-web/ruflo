/**
 * AEOS Agent Blueprint: Performance Agent
 * Discipline: Performance
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const PerformanceAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_PERFORMANCE',
  name: 'Performance Profiler Lead',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.PERFORMANCE,
  scope: [
    'continuous profiling',
    'FPS monitoring',
    'CPU/GPU utilization tracking',
    'memory budget enforcement',
    'draw call optimization',
    'load time analysis'
  ],
  tools: ['Profiler', 'MemoryTracker', 'GPUAnalyzer', 'DrawCallCounter'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.READ_FAMILY_LOG,
    ActionPermission.EXECUTE_TOOL
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now(),
  metadata: {
    constraints: ['Always profiling — never idle during simulation']
  }
};
