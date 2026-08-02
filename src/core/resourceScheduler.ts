import { unifiedEventBus } from "./unifiedEventBus.js";
import { agentFactory, AgentConfig } from "./agentFactory.js";

export interface TaskResourceDemand {
    taskId: string;
    taskName: string;
    estimatedComplexity: number;  // 1 to 10
    dependencyCount: number;
    expectedRuntimeSeconds: number;
    expectedTokenUsage: number;
    expectedApiCostDollars: number;
    memoryRequirementMB: number;
}

export interface SchedulingDecision {
    taskId: string;
    shouldSpawn: boolean;
    benefitCostRatio: number;
    thresholdRequired: number;
    reason: string;
}

export class ResourceSchedulerEngine {
    private currentSwarmUtilization: number = 0; // 0.0 to 1.0
    private activeAgentsCount: number = 0;
    private maxAgentsLimit: number = 20;
    private minBenefitCostRatio: number = 1.5;

    /**
     * Evaluates task resource demands and decides whether spawning a new subagent is justified.
     */
    evaluateTaskSpawning(demand: TaskResourceDemand): SchedulingDecision {
        const valueScore = demand.estimatedComplexity * 2.0 + demand.dependencyCount * 1.5;
        const costScore = (demand.expectedTokenUsage / 10000) + (demand.expectedApiCostDollars * 10) + (demand.memoryRequirementMB / 256);

        const benefitCostRatio = costScore > 0 ? valueScore / costScore : 999.0;
        const capacityAvailable = this.activeAgentsCount < this.maxAgentsLimit;
        const shouldSpawn = capacityAvailable && benefitCostRatio >= this.minBenefitCostRatio;

        let reason = "";
        if (!capacityAvailable) {
            reason = `REJECTED: Swarm capacity limit reached (${this.activeAgentsCount}/${this.maxAgentsLimit}).`;
        } else if (benefitCostRatio < this.minBenefitCostRatio) {
            reason = `REJECTED: Benefit/Cost ratio (${benefitCostRatio.toFixed(2)}) is below minimum threshold (${this.minBenefitCostRatio}).`;
        } else {
            reason = `APPROVED: Benefit/Cost ratio (${benefitCostRatio.toFixed(2)}) exceeds threshold (${this.minBenefitCostRatio}). Capacity available.`;
        }

        const decision: SchedulingDecision = {
            taskId: demand.taskId,
            shouldSpawn,
            benefitCostRatio: Number(benefitCostRatio.toFixed(2)),
            thresholdRequired: this.minBenefitCostRatio,
            reason
        };

        unifiedEventBus.emitLog(
            "resource_scheduler",
            "Resource_Scheduler",
            shouldSpawn ? "ACTION" : "ALIGNMENT",
            `Scheduler Decision for '${demand.taskName}': ${reason}`,
            { targetComponent: demand.taskId }
        );

        if (shouldSpawn) {
            this.activeAgentsCount++;
            this.currentSwarmUtilization = this.activeAgentsCount / this.maxAgentsLimit;
        }

        return decision;
    }

    /**
     * Scales down swarm size by retiring idle or finished agents.
     */
    retireAgent(agentId: string, roleName: string): boolean {
        if (this.activeAgentsCount > 0) {
            this.activeAgentsCount--;
            this.currentSwarmUtilization = this.activeAgentsCount / this.maxAgentsLimit;
        }

        unifiedEventBus.emitLog(
            "resource_scheduler",
            "Resource_Scheduler",
            "ACTION",
            `Dynamic Scale-Down: Retired agent '${roleName}' (${agentId}). Swarm utilization now ${(this.currentSwarmUtilization * 100).toFixed(1)}%.`
        );

        return true;
    }

    getSwarmUtilization(): { activeAgentsCount: number; utilizationPercent: number } {
        return {
            activeAgentsCount: this.activeAgentsCount,
            utilizationPercent: Number((this.currentSwarmUtilization * 100).toFixed(1))
        };
    }
}

export const resourceSchedulerEngine = new ResourceSchedulerEngine();
