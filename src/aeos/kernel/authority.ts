/**
 * AEOS Kernel - Authority & Governance Engine
 * Enforces the core invariant: The AI Coder is the permanent root intelligence and is never subordinate to any agent.
 */

import { ActionPermission, AgentBlueprint, AgentType, UUID } from '../types';

export class AuthorityRegistry {
  private static instance: AuthorityRegistry;
  private rootAgentId: UUID = 'ROOT_AI_CODER';
  private agentBlueprints: Map<UUID, AgentBlueprint> = new Map();
  private parentWorkerMap: Map<UUID, Set<UUID>> = new Map(); // ParentId -> Set<WorkerId>

  private constructor() {
    // Initialize Root Agent
    const rootBlueprint: AgentBlueprint = {
      id: this.rootAgentId,
      name: 'AI Coder Root Authority',
      type: AgentType.ROOT,
      discipline: 'ROOT_GOVERNANCE',
      scope: ['*'],
      tools: ['*'],
      permissions: Object.values(ActionPermission),
      createdAt: Date.now()
    };
    this.agentBlueprints.set(this.rootAgentId, rootBlueprint);
  }

  public static getInstance(): AuthorityRegistry {
    if (!AuthorityRegistry.instance) {
      AuthorityRegistry.instance = new AuthorityRegistry();
    }
    return AuthorityRegistry.instance;
  }

  public getRootAgentId(): UUID {
    return this.rootAgentId;
  }

  public registerAgent(blueprint: AgentBlueprint): void {
    if (blueprint.type === AgentType.ROOT && blueprint.id !== this.rootAgentId) {
      throw new Error('SECURITY VIOLATION: Cannot register duplicate ROOT authority.');
    }

    if (blueprint.parentId) {
      const parent = this.agentBlueprints.get(blueprint.parentId);
      if (!parent) {
        throw new Error(`SECURITY VIOLATION: Parent agent ${blueprint.parentId} not registered.`);
      }
      if (!this.parentWorkerMap.has(blueprint.parentId)) {
        this.parentWorkerMap.set(blueprint.parentId, new Set());
      }
      this.parentWorkerMap.get(blueprint.parentId)!.add(blueprint.id);
    }

    this.agentBlueprints.set(blueprint.id, blueprint);
  }

  public unregisterAgent(agentId: UUID): void {
    if (agentId === this.rootAgentId) {
      throw new Error('SECURITY VIOLATION: Cannot unregister ROOT authority.');
    }
    const bp = this.agentBlueprints.get(agentId);
    if (bp?.parentId) {
      this.parentWorkerMap.get(bp.parentId)?.delete(agentId);
    }
    this.agentBlueprints.delete(agentId);
  }

  public getAgent(agentId: UUID): AgentBlueprint | undefined {
    return this.agentBlueprints.get(agentId);
  }

  public getAllAgents(): AgentBlueprint[] {
    return Array.from(this.agentBlueprints.values());
  }

  public isAuthorized(agentId: UUID, permission: ActionPermission): boolean {
    const agent = this.agentBlueprints.get(agentId);
    if (!agent) return false;
    if (agent.type === AgentType.ROOT) return true;
    return agent.permissions.includes(permission);
  }

  public verifyAuthorityChain(agentId: UUID): { valid: boolean; chain: UUID[]; error?: string } {
    const chain: UUID[] = [agentId];
    let current = this.agentBlueprints.get(agentId);

    if (!current) {
      return { valid: false, chain, error: `Agent ${agentId} is not registered.` };
    }

    while (current && current.type !== AgentType.ROOT) {
      if (!current.parentId) {
        return { valid: false, chain, error: `Agent ${current.id} has no supervising parent.` };
      }
      const parent = this.agentBlueprints.get(current.parentId);
      if (!parent) {
        return { valid: false, chain, error: `Broken authority chain: Parent ${current.parentId} missing.` };
      }
      chain.push(parent.id);
      current = parent;
    }

    if (chain[chain.length - 1] !== this.rootAgentId) {
      return { valid: false, chain, error: 'Authority chain does not terminate at ROOT authority.' };
    }

    return { valid: true, chain };
  }

  public canSupervise(parentId: UUID, targetAgentId: UUID): boolean {
    if (parentId === this.rootAgentId) return true;
    const workers = this.parentWorkerMap.get(parentId);
    return workers ? workers.has(targetAgentId) : false;
  }
}
