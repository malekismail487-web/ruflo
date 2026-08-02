export interface AgentExpertiseProfile {
    agentId: string;
    roleName: string;
    confidence: number;            // 0.0 to 1.0
    historicalAccuracy: number;    // 0.0 to 1.0
    specializationScore: number;   // 0.0 to 1.0 for specific domain
    recentCorrectionRate: number;  // 0.0 to 1.0
}

export interface WeightedVote {
    agentProfile: AgentExpertiseProfile;
    voteOption: string;
    computedWeight: number;
}

export interface WeightedConsensusResult {
    proposalId: string;
    winningOption: string;
    totalWeightedVotes: number;
    winningOptionWeight: number;
    weightedSupportPercentage: number;
    voteBreakdown: Record<string, number>;
    votes: WeightedVote[];
}

export class WeightedConsensusEngine {
    /**
     * Calculates the individual voting weight of an agent based on expertise vitals.
     * W = confidence * historicalAccuracy * specializationScore * (1 - recentCorrectionRate)
     */
    calculateAgentWeight(profile: AgentExpertiseProfile): number {
        const conf = Math.max(0.01, Math.min(1.0, profile.confidence));
        const acc = Math.max(0.01, Math.min(1.0, profile.historicalAccuracy));
        const spec = Math.max(0.01, Math.min(1.0, profile.specializationScore));
        const corrPenalty = Math.max(0.0, Math.min(0.95, profile.recentCorrectionRate));

        const rawWeight = conf * acc * spec * (1.0 - corrPenalty);
        return Number(rawWeight.toFixed(4));
    }

    /**
     * Executes a confidence-weighted consensus vote across participating agents.
     */
    evaluateWeightedVote(
        proposalId: string,
        agentVotes: { profile: AgentExpertiseProfile; voteOption: string }[]
    ): WeightedConsensusResult {
        const breakdown: Record<string, number> = {};
        let totalWeightedVotes = 0;

        const weightedVotes: WeightedVote[] = agentVotes.map(av => {
            const weight = this.calculateAgentWeight(av.profile);
            totalWeightedVotes += weight;
            breakdown[av.voteOption] = (breakdown[av.voteOption] || 0) + weight;

            return {
                agentProfile: av.profile,
                voteOption: av.voteOption,
                computedWeight: weight
            };
        });

        let winningOption = "";
        let winningOptionWeight = -1;

        for (const [option, weight] of Object.entries(breakdown)) {
            if (weight > winningOptionWeight) {
                winningOptionWeight = weight;
                winningOption = option;
            }
        }

        const weightedSupportPercentage = totalWeightedVotes > 0 ? (winningOptionWeight / totalWeightedVotes) * 100 : 0;

        return {
            proposalId,
            winningOption,
            totalWeightedVotes: Number(totalWeightedVotes.toFixed(4)),
            winningOptionWeight: Number(winningOptionWeight.toFixed(4)),
            weightedSupportPercentage: Number(weightedSupportPercentage.toFixed(2)),
            voteBreakdown: breakdown,
            votes: weightedVotes
        };
    }
}

export const weightedConsensusEngine = new WeightedConsensusEngine();
