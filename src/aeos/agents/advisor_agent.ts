/**
 * AEOS Agent Blueprint: Advisor Agent
 * Discipline: Advisory
 * Authority Level: PARENT
 */

import { ActionPermission, AgentBlueprint, AgentType, EngineeringDiscipline } from '../types';

export const AdvisorAgentBlueprint: AgentBlueprint = {
  id: 'AGENT_ADVISOR',
  name: 'Architectural Advisor',
  type: AgentType.PARENT,
  discipline: EngineeringDiscipline.ADVISORY,
  scope: [
    'challenge assumptions',
    'suggest better architectures',
    'estimate technical risk',
    'detect overengineering',
    'identify missing systems',
    'recommend next milestone'
  ],
  tools: ['KnowledgeGraph', 'ResearchInterface', 'RiskEstimator'],
  permissions: [
    ActionPermission.READ_GLOBAL_LOG,
    ActionPermission.SUBMIT_PROPOSAL
  ],
  parentId: 'ROOT_AI_CODER',
  createdAt: Date.now(),
  metadata: {
    persistentQuery: 'What are we forgetting?'
  }
};
