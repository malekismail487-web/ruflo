/**
 * AEOS Kernel - 3-Layer Communication Infrastructure
 * Enforces strict channel isolation, permissions, and information propagation:
 *  1. Global Log (Visible to all, writable only by Root)
 *  2. Family Log (Isolated per engineering discipline)
 *  3. Personal Workspace (Private to worker and supervising parent)
 */

import {
  ActionPermission,
  AgentType,
  EngineeringDiscipline,
  LogEntry,
  PersonalWorkspaceData,
  UUID
} from '../types';
import { AuthorityRegistry } from './authority';

export class CommunicationHub {
  private static instance: CommunicationHub;
  private authority: AuthorityRegistry;

  private globalLog: LogEntry[] = [];
  private familyLogs: Map<string, LogEntry[]> = new Map(); // Discipline -> Entries
  private personalWorkspaces: Map<UUID, PersonalWorkspaceData> = new Map(); // WorkerId -> Workspace

  private constructor() {
    this.authority = AuthorityRegistry.getInstance();
  }

  public static getInstance(): CommunicationHub {
    if (!CommunicationHub.instance) {
      CommunicationHub.instance = new CommunicationHub();
    }
    return CommunicationHub.instance;
  }

  // ==========================================
  // CHANNEL 1: GLOBAL LOG
  // ==========================================

  public readGlobalLog(agentId: UUID): LogEntry[] {
    if (!this.authority.isAuthorized(agentId, ActionPermission.READ_GLOBAL_LOG)) {
      throw new Error(`SECURITY VIOLATION: Agent ${agentId} lacks READ_GLOBAL_LOG permission.`);
    }
    return [...this.globalLog];
  }

  public publishToGlobalLog(
    agentId: UUID,
    category: LogEntry['category'],
    content: string,
    evidence?: any
  ): LogEntry {
    const agent = this.authority.getAgent(agentId);
    if (!agent) {
      throw new Error(`Unregistered agent ${agentId} cannot write to Global Log.`);
    }

    if (agent.type !== AgentType.ROOT && !this.authority.isAuthorized(agentId, ActionPermission.WRITE_GLOBAL_LOG)) {
      throw new Error(`GOVERNANCE VIOLATION: Only Root Authority can publish official entries to the Global Log.`);
    }

    const entry: LogEntry = {
      id: `GLOG_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      authorId: agentId,
      authorType: agent.type,
      discipline: agent.discipline,
      category,
      content,
      evidence
    };

    this.globalLog.push(entry);
    return entry;
  }

  // ==========================================
  // CHANNEL 2: FAMILY LOG
  // ==========================================

  public readFamilyLog(agentId: UUID, discipline: EngineeringDiscipline | string): LogEntry[] {
    const agent = this.authority.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not registered.`);

    // Root can read all family logs. Other agents can only read their own family log.
    if (agent.type !== AgentType.ROOT && agent.discipline !== discipline) {
      throw new Error(`SECURITY VIOLATION: Agent ${agentId} from ${agent.discipline} cannot read ${discipline} Family Log.`);
    }

    return [...(this.familyLogs.get(discipline) || [])];
  }

  public publishToFamilyLog(
    agentId: UUID,
    category: LogEntry['category'],
    content: string,
    evidence?: any
  ): LogEntry {
    const agent = this.authority.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not registered.`);

    if (!this.authority.isAuthorized(agentId, ActionPermission.WRITE_FAMILY_LOG)) {
      throw new Error(`SECURITY VIOLATION: Agent ${agentId} lacks WRITE_FAMILY_LOG permission.`);
    }

    const discipline = agent.discipline;
    if (!this.familyLogs.has(discipline)) {
      this.familyLogs.set(discipline, []);
    }

    const entry: LogEntry = {
      id: `FLOG_${discipline}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      authorId: agentId,
      authorType: agent.type,
      discipline,
      category,
      content,
      evidence
    };

    this.familyLogs.get(discipline)!.push(entry);
    return entry;
  }

  // ==========================================
  // CHANNEL 3: PERSONAL WORKSPACE
  // ==========================================

  public getPersonalWorkspace(callerId: UUID, targetWorkerId: UUID): PersonalWorkspaceData {
    // Only the worker itself, its supervising parent, or the Root authority may access
    const isSelf = callerId === targetWorkerId;
    const isSupervisor = this.authority.canSupervise(callerId, targetWorkerId);

    if (!isSelf && !isSupervisor) {
      throw new Error(`SECURITY VIOLATION: Agent ${callerId} is not permitted to access Personal Workspace of ${targetWorkerId}.`);
    }

    if (!this.personalWorkspaces.has(targetWorkerId)) {
      this.personalWorkspaces.set(targetWorkerId, {
        workerId: targetWorkerId,
        currentObjective: '',
        drafts: {},
        intermediateReasoning: [],
        experiments: [],
        notes: [],
        metrics: {},
        lastUpdated: Date.now()
      });
    }

    return this.personalWorkspaces.get(targetWorkerId)!;
  }

  public updatePersonalWorkspace(
    callerId: UUID,
    targetWorkerId: UUID,
    updates: Partial<Omit<PersonalWorkspaceData, 'workerId'>>
  ): PersonalWorkspaceData {
    const ws = this.getPersonalWorkspace(callerId, targetWorkerId);
    Object.assign(ws, updates, { lastUpdated: Date.now() });
    return ws;
  }
}
