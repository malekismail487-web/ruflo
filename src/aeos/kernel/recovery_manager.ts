/**
 * AEOS Kernel - Fault Tolerance & Recovery Manager
 * Manages health monitoring, crash detection, checkpoint restoration, and worker recreation.
 */

import { AgentBlueprint, UUID } from '../types';
import { AgentLifecycleManager } from './agent_lifecycle';
import { AuthorityRegistry } from './authority';
import { CommunicationHub } from './communication';

export interface WorkerCheckpoint {
  checkpointId: UUID;
  workerId: UUID;
  timestamp: number;
  completedSubtasks: string[];
  pendingWorkload: string;
  serializedState: Record<string, any>;
}

export class RecoveryManager {
  private static instance: RecoveryManager;
  private authority: AuthorityRegistry;
  private lifecycle: AgentLifecycleManager;
  private comms: CommunicationHub;

  private checkpoints: Map<UUID, WorkerCheckpoint[]> = new Map(); // WorkerId -> Checkpoints
  private workerHeartbeats: Map<UUID, number> = new Map();

  private constructor() {
    this.authority = AuthorityRegistry.getInstance();
    this.lifecycle = AgentLifecycleManager.getInstance();
    this.comms = CommunicationHub.getInstance();
  }

  public static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }

  public recordHeartbeat(workerId: UUID): void {
    this.workerHeartbeats.set(workerId, Date.now());
  }

  public saveCheckpoint(
    workerId: UUID,
    completedSubtasks: string[],
    pendingWorkload: string,
    state: Record<string, any>
  ): WorkerCheckpoint {
    const checkpoint: WorkerCheckpoint = {
      checkpointId: `CP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workerId,
      timestamp: Date.now(),
      completedSubtasks,
      pendingWorkload,
      serializedState: state
    };

    if (!this.checkpoints.has(workerId)) {
      this.checkpoints.set(workerId, []);
    }
    this.checkpoints.get(workerId)!.push(checkpoint);

    return checkpoint;
  }

  public getLatestCheckpoint(workerId: UUID): WorkerCheckpoint | undefined {
    const cps = this.checkpoints.get(workerId);
    if (!cps || cps.length === 0) return undefined;
    return cps[cps.length - 1];
  }

  /**
   * Recovers a failed worker from its latest saved checkpoint.
   */
  public recoverWorker(failedWorkerId: UUID, errorReason: string): {
    recreatedWorker: AgentBlueprint;
    restoredCheckpoint?: WorkerCheckpoint;
  } {
    const failedAgent = this.authority.getAgent(failedWorkerId);
    if (!failedAgent) throw new Error(`Agent ${failedWorkerId} not found.`);

    const parentId = failedAgent.parentId!;
    const latestCp = this.getLatestCheckpoint(failedWorkerId);

    // Announce to Family Log
    this.comms.publishToFamilyLog(
      parentId,
      'BLOCKER',
      `Worker failure detected on ${failedAgent.name}: ${errorReason}. Initiating recovery...`,
      { failedWorkerId, errorReason }
    );

    // Recreate worker under parent
    const objective = latestCp?.pendingWorkload || failedAgent.metadata?.currentObjective || 'Resumed task';
    const recreatedWorker = this.lifecycle.instantiateWorker(
      parentId,
      `[Recovered] ${objective}`,
      failedAgent.scope,
      failedAgent.tools
    );

    // Restore workspace notes
    if (latestCp) {
      this.comms.updatePersonalWorkspace(recreatedWorker.id, recreatedWorker.id, {
        currentObjective: objective,
        notes: [`Restored from checkpoint ${latestCp.checkpointId} after failure: ${errorReason}`],
        metrics: latestCp.serializedState?.metrics || {}
      });
    }

    // Retire failed agent reference
    this.lifecycle.retireAgent(failedWorkerId, `Retired due to failure: ${errorReason}`);

    return { recreatedWorker, restoredCheckpoint: latestCp };
  }
}
