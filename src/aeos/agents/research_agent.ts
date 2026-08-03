/**
 * AEOS Agent Blueprint: Research Agent
 * Discipline: Research
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const ResearchAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_RESEARCH',
  name: 'Research & Evidence Lead',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.RESEARCH,
  scope: [
    'documentation search',
    'academic paper retrieval',
    'algorithm comparison',
    'evidence collection',
    'engineering reference lookup'
  ],
  tools: ['WebSearch', 'DocumentationIndex', 'PaperDatabase'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.READ_FAMILY_LOG,
    ActionPermission.WRITE_FAMILY_LOG
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now(),
  metadata: {
    constraints: ['NEVER modifies code — read-only intelligence']
  }
};
