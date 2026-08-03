/**
 * Autonomous Engineering Operating System (AEOS)
 * Core Type Definitions & Interfaces
 */

export type UUID = string;

export enum AgentType {
  ROOT = 'ROOT',                     // The AI Coder (Permanent Root Authority)
  PARENT = 'PARENT',                 // Engineering Discipline Leads (Dynamic)
  WORKER = 'WORKER',                 // Implementation Workers
  TEMPORARY_HELPER = 'TEMPORARY_HELPER' // Ephemeral Issue Debuggers
}

export enum EngineeringDiscipline {
  ORCHESTRATION = 'ORCHESTRATION',
  PHYSICS = 'PHYSICS',
  ADVISORY = 'ADVISORY',
  VALIDATION = 'VALIDATION',
  GEOMETRY = 'GEOMETRY',
  ANIMATION = 'ANIMATION',
  RENDERING = 'RENDERING',
  GAMEPLAY = 'GAMEPLAY',
  PERFORMANCE = 'PERFORMANCE',
  RESEARCH = 'RESEARCH',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  CUSTOM = 'CUSTOM'
}

export enum ActionPermission {
  READ_GLOBAL_LOG = 'READ_GLOBAL_LOG',
  WRITE_GLOBAL_LOG = 'WRITE_GLOBAL_LOG',
  READ_FAMILY_LOG = 'READ_FAMILY_LOG',
  WRITE_FAMILY_LOG = 'WRITE_FAMILY_LOG',
  ACCESS_PERSONAL_WORKSPACE = 'ACCESS_PERSONAL_WORKSPACE',
  REQUEST_WORKERS = 'REQUEST_WORKERS',
  SUBMIT_PROPOSAL = 'SUBMIT_PROPOSAL',
  APPROVE_PROPOSAL = 'APPROVE_PROPOSAL',
  EXECUTE_TOOL = 'EXECUTE_TOOL',
  EXECUTE_SIMULATION = 'EXECUTE_SIMULATION',
  MODIFY_KNOWLEDGE_GRAPH = 'MODIFY_KNOWLEDGE_GRAPH',
  AUTHORIZE_AGENTS = 'AUTHORIZE_AGENTS'
}

export interface AgentBlueprint {
  id: UUID;
  name: string;
  type: AgentType;
  discipline: EngineeringDiscipline | string;
  scope: string[];
  tools: string[];
  permissions: ActionPermission[];
  parentId?: UUID;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface WorkforceRequest {
  requestId: UUID;
  parentId: UUID;
  discipline: EngineeringDiscipline | string;
  reason: string;
  estimatedWorkloadHours: number;
  requestedWorkerCount: number;
  expectedBenefit: string;
  status: 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';
  approvedCount?: number;
  rejectionReason?: string;
  timestamp: number;
}

export interface TemporaryHelperRequest {
  requestId: UUID;
  workerId: UUID;
  parentId: UUID;
  blockerDescription: string;
  evidence: any[];
  attemptedSolutions: string[];
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED' | 'RETIRED';
  timestamp: number;
}

// Communication System Interfaces
export interface LogEntry {
  id: UUID;
  timestamp: number;
  authorId: UUID;
  authorType: AgentType;
  discipline?: EngineeringDiscipline | string;
  category: 'MILESTONE' | 'DECISION' | 'DISCOVERY' | 'FEATURE' | 'INTERFACE_CHANGE' | 'HEALTH' | 'DISCUSSION' | 'BLOCKER' | 'ASSISTANCE';
  content: string;
  evidence?: any;
}

export interface PersonalWorkspaceData {
  workerId: UUID;
  currentObjective: string;
  drafts: Record<string, string>;
  intermediateReasoning: string[];
  experiments: Array<{ name: string; hypothesis: string; result?: any; status: 'IN_PROGRESS' | 'PASSED' | 'FAILED' }>;
  notes: string[];
  metrics: Record<string, number>;
  lastUpdated: number;
}

// Proposal System Interfaces
export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PARENT_APPROVED = 'PARENT_APPROVED',
  PARENT_REJECTED = 'PARENT_REJECTED',
  PARENT_REVISED = 'PARENT_REVISED',
  AI_CODER_APPROVED = 'AI_CODER_APPROVED',
  AI_CODER_REJECTED = 'AI_CODER_REJECTED',
  IMPLEMENTING = 'IMPLEMENTING',
  VALIDATED = 'VALIDATED',
  PUBLISHED_TO_KNOWLEDGE_GRAPH = 'PUBLISHED_TO_KNOWLEDGE_GRAPH'
}

export interface ArchitecturalProposal {
  id: UUID;
  proposerId: UUID;
  parentId: UUID;
  title: string;
  discipline: EngineeringDiscipline | string;
  motivation: string;
  expectedBenefits: string[];
  risks: string[];
  validationStrategy: string;
  status: ProposalStatus;
  parentFeedback?: string;
  aiCoderFeedback?: string;
  validationReport?: {
    passed: boolean;
    metrics: Record<string, any>;
    evidenceArtifacts: string[];
  };
  createdAt: number;
  updatedAt: number;
}

// Knowledge Graph Interfaces
export enum RelationshipType {
  CONTAINS = 'CONTAINS',
  DRIVES = 'DRIVES',
  CONSTRAINS = 'CONSTRAINS',
  CONNECTS_TO = 'CONNECTS_TO',
  REQUIRES = 'REQUIRES',
  SIMULATES = 'SIMULATES'
}

export interface EngineeringRule {
  id: string;
  name: string;
  description: string;
  validator: (params: Record<string, any>) => { valid: boolean; reason?: string };
}

export interface KnowledgeNode {
  id: string;
  type: string;
  category: 'COMPONENT' | 'SUBSYSTEM' | 'ASSEMBLY' | 'MATERIAL' | 'CONSTRAINT_SYSTEM';
  geometry?: {
    proceduralGenerator: string;
    parameters: Record<string, any>;
    lodSpecs?: Record<string, number>;
    topologyRules?: string[];
  };
  physics?: {
    massKg?: number;
    friction?: number;
    restitution?: number;
    jointType?: 'FIXED' | 'REVOLUTE' | 'PRISMATIC' | 'SPHERICAL' | 'D6';
    jointLimits?: { min: number; max: number };
    collisionLayer?: string;
  };
  engineeringRules?: string[];
  metadata?: Record<string, any>;
}

export interface KnowledgeRelationship {
  fromNodeId: string;
  toNodeId: string;
  type: RelationshipType;
  parameters?: Record<string, any>;
}

// Resource Manager Interfaces
export interface ComputeResourceMetrics {
  cpuUtilizationPercent: number;
  gpuUtilizationPercent: number;
  vramUsedMb: number;
  vramTotalMb: number;
  ramUsedMb: number;
  ramTotalMb: number;
  diskUsedGb: number;
  diskFreeGb: number;
  apiQuotaPercentUsed: number;
  activeWorkerCount: number;
  maxWorkerCapacity: number;
}

// Dependency Graph Interfaces
export interface TaskNode {
  taskId: UUID;
  title: string;
  discipline: EngineeringDiscipline | string;
  dependencies: UUID[];
  estimatedDurationSec: number;
  status: 'BLOCKED' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  assignedWorkerId?: UUID;
  resultPayload?: any;
}
