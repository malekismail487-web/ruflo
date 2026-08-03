/**
 * AEOS Kernel - Agent Lifecycle & Workforce Manager
 * Manages creation, allocation, scaling, helper dispatch, and graceful retirement of agents.
 */

import {
  ActionPermission,
  AgentBlueprint,
  AgentType,
  EngineeringDiscipline,
  TemporaryHelperRequest,
  UUID,
  WorkforceRequest
} from '../types';
import { AuthorityRegistry } from './authority';

export class AgentLifecycleManager {
  private static instance: AgentLifecycleManager;
  private authority: AuthorityRegistry;
  private workforceRequests: Map<UUID, WorkforceRequest> = new Map();
  private helperRequests: Map<UUID, TemporaryHelperRequest> = new Map();

  private constructor() {
    this.authority = AuthorityRegistry.getInstance();
  }

  public static getInstance(): AgentLifecycleManager {
    if (!AgentLifecycleManager.instance) {
      AgentLifecycleManager.instance = new AgentLifecycleManager();
    }
    return AgentLifecycleManager.instance;
  }

  /**
   * Root Authority creates a new Parent Agent for an engineering discipline.
   */
  public createParentAgent(
    callerId: UUID,
    discipline: EngineeringDiscipline | string,
    name: string,
    scope: string[],
    tools: string[]
  ): AgentBlueprint {
    if (callerId !== this.authority.getRootAgentId()) {
      throw new Error('SECURITY VIOLATION: Only Root Authority (AI Coder) can create Parent Agents.');
    }

    const parentId: UUID = `PARENT_${discipline}_${Date.now()}`;
    const blueprint: AgentBlueprint = {
      id: parentId,
      name,
      type: AgentType.PARENT,
      discipline,
      scope,
      tools,
      permissions: [
        ActionPermission.READ_GLOBAL_LOG,
        ActionPermission.READ_FAMILY_LOG,
        ActionPermission.WRITE_FAMILY_LOG,
        ActionPermission.REQUEST_WORKERS,
        ActionPermission.SUBMIT_PROPOSAL,
        ActionPermission.APPROVE_PROPOSAL,
        ActionPermission.EXECUTE_TOOL,
        ActionPermission.ACCESS_PERSONAL_WORKSPACE
      ],
      parentId: this.authority.getRootAgentId(),
      createdAt: Date.now()
    };

    this.authority.registerAgent(blueprint);
    return blueprint;
  }

  /**
   * Parent Agent submits a workforce expansion request to the AI Coder.
   */
  public requestWorkforceExpansion(
    parentId: UUID,
    reason: string,
    requestedWorkerCount: number,
    estimatedWorkloadHours: number,
    expectedBenefit: string
  ): WorkforceRequest {
    const parent = this.authority.getAgent(parentId);
    if (!parent || parent.type !== AgentType.PARENT) {
      throw new Error(`Only authorized Parent Agents can submit workforce expansion requests.`);
    }

    const requestId: UUID = `WREQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const request: WorkforceRequest = {
      requestId,
      parentId,
      discipline: parent.discipline,
      reason,
      estimatedWorkloadHours,
      requestedWorkerCount,
      expectedBenefit,
      status: 'PENDING',
      timestamp: Date.now()
    };

    this.workforceRequests.set(requestId, request);
    return request;
  }

  /**
   * Root Authority reviews and evaluates a workforce request.
   */
  public evaluateWorkforceRequest(
    callerId: UUID,
    requestId: UUID,
    decision: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED',
    approvedCount: number = 0,
    rejectionReason?: string
  ): WorkforceRequest {
    if (callerId !== this.authority.getRootAgentId()) {
      throw new Error('SECURITY VIOLATION: Only Root Authority can evaluate workforce requests.');
    }

    const request = this.workforceRequests.get(requestId);
    if (!request) {
      throw new Error(`Workforce request ${requestId} not found.`);
    }

    request.status = decision;
    request.approvedCount = decision === 'REJECTED' ? 0 : approvedCount;
    request.rejectionReason = rejectionReason;

    return request;
  }

  /**
   * Parent Agent instantiates an authorized worker agent.
   */
  public instantiateWorker(
    parentId: UUID,
    objective: string,
    scope: string[],
    tools: string[]
  ): AgentBlueprint {
    const parent = this.authority.getAgent(parentId);
    if (!parent || parent.type !== AgentType.PARENT) {
      throw new Error(`SECURITY VIOLATION: Only Parent Agents can instantiate workers.`);
    }

    const workerId: UUID = `WORKER_${parent.discipline}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const blueprint: AgentBlueprint = {
      id: workerId,
      name: `${parent.discipline} Worker (${objective.substring(0, 20)})`,
      type: AgentType.WORKER,
      discipline: parent.discipline,
      scope,
      tools,
      permissions: [
        ActionPermission.READ_GLOBAL_LOG,
        ActionPermission.READ_FAMILY_LOG,
        ActionPermission.WRITE_FAMILY_LOG,
        ActionPermission.ACCESS_PERSONAL_WORKSPACE,
        ActionPermission.SUBMIT_PROPOSAL,
        ActionPermission.EXECUTE_TOOL
      ],
      parentId,
      createdAt: Date.now(),
      metadata: { currentObjective: objective }
    };

    this.authority.registerAgent(blueprint);
    return blueprint;
  }

  /**
   * Dispatches a temporary helper agent for a blocked worker.
   */
  public requestTemporaryHelper(
    workerId: UUID,
    blockerDescription: string,
    evidence: any[],
    attemptedSolutions: string[]
  ): AgentBlueprint {
    const worker = this.authority.getAgent(workerId);
    if (!worker || worker.type !== AgentType.WORKER) {
      throw new Error(`Only Worker agents can trigger temporary helper requests.`);
    }

    const requestId: UUID = `HELP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const helperReq: TemporaryHelperRequest = {
      requestId,
      workerId,
      parentId: worker.parentId!,
      blockerDescription,
      evidence,
      attemptedSolutions,
      status: 'ACTIVE',
      timestamp: Date.now()
    };
    this.helperRequests.set(requestId, helperReq);

    const helperId: UUID = `HELPER_${worker.discipline}_${Date.now()}`;
    const helperBlueprint: AgentBlueprint = {
      id: helperId,
      name: `Temporary Debugger for ${worker.name}`,
      type: AgentType.TEMPORARY_HELPER,
      discipline: worker.discipline,
      scope: [`Investigate blocker: ${blockerDescription}`],
      tools: worker.tools,
      permissions: [
        ActionPermission.READ_GLOBAL_LOG,
        ActionPermission.READ_FAMILY_LOG,
        ActionPermission.WRITE_FAMILY_LOG,
        ActionPermission.EXECUTE_TOOL
      ],
      parentId: worker.parentId,
      createdAt: Date.now(),
      metadata: { targetWorkerId: workerId, requestId }
    };

    this.authority.registerAgent(helperBlueprint);
    return helperBlueprint;
  }

  /**
   * Gracefully retires a worker or helper upon task completion.
   */
  public retireAgent(agentId: UUID, summaryNotes: string): void {
    const agent = this.authority.getAgent(agentId);
    if (!agent) return;
    if (agent.type === AgentType.ROOT) {
      throw new Error('SECURITY VIOLATION: Cannot retire Root Authority.');
    }

    // Unregister from authority registry
    this.authority.unregisterAgent(agentId);
  }

  public getWorkforceRequests(): WorkforceRequest[] {
    return Array.from(this.workforceRequests.values());
  }
}
