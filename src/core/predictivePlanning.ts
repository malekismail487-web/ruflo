import { unifiedEventBus } from "./unifiedEventBus.js";
import { agentFactory, AgentConfig } from "./agentFactory.js";

export interface RiskCategoryAssessment {
    category: "ARCHITECTURAL" | "INTEGRATION" | "DEPENDENCY" | "PERFORMANCE" | "SECURITY";
    riskScore: number; // 0.0 to 1.0
    description: string;
    mitigationStrategy: string;
}

export interface PredictiveRiskReport {
    projectName: string;
    overallRiskScore: number;
    assessments: RiskCategoryAssessment[];
    mitigationAgentsSpawned: string[];
}

export class PredictivePlanningEngine {
    private riskThreshold: number = 0.35; // 35% risk threshold triggers proactive mitigation

    /**
     * Evaluates project proposals and predicts potential engineering risks before building.
     */
    assessProjectRisks(projectName: string, proposalText: string): PredictiveRiskReport {
        const assessments: RiskCategoryAssessment[] = [
            {
                category: "ARCHITECTURAL",
                riskScore: proposalText.includes("decoupled") ? 0.15 : 0.45,
                description: "Risk of tight coupling between physics solver and render loop.",
                mitigationStrategy: "Enforce strict abstract interface boundaries."
            },
            {
                category: "INTEGRATION",
                riskScore: proposalText.includes("Vulkan") ? 0.30 : 0.50,
                description: "Risk of graphics API pipeline handle mismatches during Vulkan init.",
                mitigationStrategy: "Generate Vulkan validation layer wrapper tests."
            },
            {
                category: "DEPENDENCY",
                riskScore: 0.10,
                description: "Risk of circular imports across modules.",
                mitigationStrategy: "Run static dependency graph audit."
            },
            {
                category: "PERFORMANCE",
                riskScore: proposalText.includes("N-body") ? 0.40 : 0.20,
                description: "Risk of $O(N^2)$ N-body gravitational gravity calculation bottleneck.",
                mitigationStrategy: "Implement Barnes-Hut quadtree spatial partitioning."
            },
            {
                category: "SECURITY",
                riskScore: 0.05,
                description: "Risk of raw pointer buffer overrun.",
                mitigationStrategy: "Enforce safe buffer bounds wrappers."
            }
        ];

        let maxRisk = 0;
        assessments.forEach(a => { if (a.riskScore > maxRisk) maxRisk = a.riskScore; });

        const mitigationAgentsSpawned: string[] = [];

        // Proactively spawn risk mitigation agents for any category exceeding threshold
        assessments.forEach(a => {
            if (a.riskScore >= this.riskThreshold) {
                const agent = agentFactory.createAgent(
                    `Proactive_Mitigation_${a.category}`,
                    `Proactive Risk Mitigation Agent for ${a.category}. Goal: ${a.mitigationStrategy}`,
                    ["risk_mitigation"]
                );

                mitigationAgentsSpawned.push(agent.id);

                unifiedEventBus.emitLog(
                    agent.id,
                    agent.roleName,
                    "ACTION",
                    `[PROACTIVE RISK MITIGATION] Spawned proactive agent for category ${a.category} (RiskScore=${(a.riskScore * 100).toFixed(1)}%). Strategy: "${a.mitigationStrategy}"`,
                    { targetComponent: a.category }
                );
            }
        });

        return {
            projectName,
            overallRiskScore: Number(maxRisk.toFixed(2)),
            assessments,
            mitigationAgentsSpawned
        };
    }
}

export const predictivePlanningEngine = new PredictivePlanningEngine();
