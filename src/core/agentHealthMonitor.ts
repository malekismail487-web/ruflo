import { unifiedEventBus } from "./unifiedEventBus.js";
import { resourceSchedulerEngine } from "./resourceScheduler.js";

export interface AgentHealthVitals {
    agentId: string;
    roleName: string;
    confidence: number;            // 0.0 to 1.0
    specialization: number;        // 0.0 to 1.0
    memoryUsageMB: number;
    runtimeSeconds: number;
    latencyMs: number;
    hallucinationProbabilityEstimate: number; // 0.0 to 1.0
    correctionCount: number;
    successfulContributions: number;
    failedContributions: number;
    healthy: boolean;
    statusRecommendation: "HEALTHY" | "WARN_MONITOR" | "RETIRE_REPLACE";
}

export class AgentHealthMonitorEngine {
    private vitalsMap: Map<string, AgentHealthVitals> = new Map();

    /**
     * Publishes and evaluates live agent health vitals.
     */
    publishVitals(vitals: Omit<AgentHealthVitals, "healthy" | "statusRecommendation">): AgentHealthVitals {
        const failureRatio = vitals.successfulContributions + vitals.failedContributions > 0
            ? vitals.failedContributions / (vitals.successfulContributions + vitals.failedContributions)
            : 0;

        let status: "HEALTHY" | "WARN_MONITOR" | "RETIRE_REPLACE" = "HEALTHY";
        let healthy = true;

        if (vitals.hallucinationProbabilityEstimate > 0.40 || failureRatio > 0.35 || vitals.correctionCount >= 5) {
            status = "RETIRE_REPLACE";
            healthy = false;
        } else if (vitals.hallucinationProbabilityEstimate > 0.20 || vitals.latencyMs > 2000) {
            status = "WARN_MONITOR";
        }

        const fullVitals: AgentHealthVitals = {
            ...vitals,
            healthy,
            statusRecommendation: status
        };

        this.vitalsMap.set(vitals.agentId, fullVitals);

        if (!healthy) {
            unifiedEventBus.emitLog(
                "agent_health_monitor",
                "Agent_Health_Monitor",
                "ERROR_DETECTED",
                `[HEALTH ALERT] Agent '${vitals.roleName}' (${vitals.agentId}) evaluated UNHEALTHY (HallucinationProb=${(vitals.hallucinationProbabilityEstimate * 100).toFixed(1)}%, Corrections=${vitals.correctionCount}). Triggering automatic retirement/replacement policy.`,
                { targetComponent: vitals.agentId }
            );

            // Execute automatic retirement policy
            resourceSchedulerEngine.retireAgent(vitals.agentId, vitals.roleName);
        }

        return fullVitals;
    }

    getVitals(agentId: string): AgentHealthVitals | undefined {
        return this.vitalsMap.get(agentId);
    }

    getAllVitals(): AgentHealthVitals[] {
        return Array.from(this.vitalsMap.values());
    }
}

export const agentHealthMonitorEngine = new AgentHealthMonitorEngine();
