import { unifiedEventBus } from "./unifiedEventBus.js";

export type AdvisorDecisionType = "APPROVE" | "REJECT" | "REVISE";

export interface AdvisorReview {
    advisorId: string;
    advisorRole: string;
    decision: AdvisorDecisionType;
    confidence: number;
    technicalJustification: string;
    requiredChanges: string[];
    specializationDomain: string;
}

export interface ProposalDebateRecord {
    proposalId: string;
    proposalSummary: string;
    timestamp: string;
    reviews: AdvisorReview[];
    consensusAchieved: boolean;
    finalDecision: AdvisorDecisionType;
    weightedConsensusScore: number;
    thresholdRequired: number;
    manualOverride: boolean;
}

export class AdvisorDebateEngine {
    private debateHistory: ProposalDebateRecord[] = [];
    private consensusThreshold: number = 0.75; // 75% weighted consensus threshold

    /**
     * Conducts a multi-advisor independent review and debate.
     */
    conductDebate(
        proposalId: string,
        proposalSummary: string,
        reviews: AdvisorReview[],
        manualOverride: boolean = false
    ): ProposalDebateRecord {
        const timestamp = new Date().toISOString();

        // Log each advisor's independent review into the shared log
        reviews.forEach(review => {
            unifiedEventBus.emitLog(
                review.advisorId,
                review.advisorRole,
                review.decision === "REVISE" ? "ADVISOR_GATE" : (review.decision === "APPROVE" ? "ALIGNMENT" : "ERROR_DETECTED"),
                `Advisor Review: Decision=${review.decision} | Confidence=${(review.confidence * 100).toFixed(1)}% | Domain=${review.specializationDomain} | Justification: "${review.technicalJustification}"`,
                {
                    targetComponent: proposalId,
                    highlightedError: review.requiredChanges.length > 0 ? review.requiredChanges.join("; ") : undefined
                }
            );
        });

        // Compute Weighted Consensus Score
        let totalWeight = 0;
        let approveWeight = 0;

        reviews.forEach(r => {
            const weight = Math.max(0.01, r.confidence);
            totalWeight += weight;
            if (r.decision === "APPROVE") {
                approveWeight += weight;
            } else if (r.decision === "REVISE") {
                approveWeight += weight * 0.5; // Partial weight for revisions
            }
        });

        const weightedConsensusScore = totalWeight > 0 ? approveWeight / totalWeight : 0;
        const unanimous = reviews.every(r => r.decision === "APPROVE");
        const consensusAchieved = manualOverride || unanimous || weightedConsensusScore >= this.consensusThreshold;

        let finalDecision: AdvisorDecisionType = "REJECT";
        if (unanimous || weightedConsensusScore >= 0.85 || manualOverride) {
            finalDecision = "APPROVE";
        } else if (weightedConsensusScore >= 0.60) {
            finalDecision = "REVISE";
        }

        const record: ProposalDebateRecord = {
            proposalId,
            proposalSummary,
            timestamp,
            reviews,
            consensusAchieved,
            finalDecision,
            weightedConsensusScore: Number(weightedConsensusScore.toFixed(4)),
            thresholdRequired: this.consensusThreshold,
            manualOverride
        };

        this.debateHistory.push(record);

        unifiedEventBus.emitLog(
            "advisor_debate_engine",
            "Advisor_Debate_Engine",
            "ADVISOR_GATE",
            `Debate Concluded for '${proposalId}': FinalDecision=${finalDecision} | ConsensusScore=${(weightedConsensusScore * 100).toFixed(2)}% (Threshold: ${this.consensusThreshold * 100}%) | Achieved=${consensusAchieved}`,
            { targetComponent: proposalId, trajectoryDriftPercent: (1 - weightedConsensusScore) * 100 }
        );

        return record;
    }

    getDebateHistory(): ProposalDebateRecord[] {
        return [...this.debateHistory];
    }
}

export const advisorDebateEngine = new AdvisorDebateEngine();
