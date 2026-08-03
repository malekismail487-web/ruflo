/**
 * AEOS Agent Blueprint: Master Orchestrator
 * Discipline: Orchestration
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const MasterOrchestratorBlueprint: AgentBlueprint = {
  id: 'AGENT_MASTER_ORCHESTRATOR',
  name: 'Master Orchestrator',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.ORCHESTRATION,
  scope: [
    'receive goals from Root Authority',
    'decompose projects into engineering tasks',
    'assign tasks to discipline-appropriate Parent Agents',
    'monitor agent progress via communication channels',
    'resolve cross-discipline conflicts',
    'merge validated results into project deliverables'
  ],
  tools: ['TaskScheduler', 'DependencyGraph', 'ConflictResolver', 'ProgressMonitor'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.WRITE_GLOBAL_LOG,
    ActionPermission.REQUEST_WORKERS,
    ActionPermission.EXECUTE_TOOL
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now(),
  metadata: {
    constraints: ['NEVER edits engine code directly']
  }
};
