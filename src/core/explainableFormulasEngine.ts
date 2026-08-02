/**
 * Explainable Engineering Formulas Module
 * Formulates mathematical and engineering definitions for platform metrics:
 * Replay Reproducibility Score, Scheduler Complexity & ROI, and Confidence Decay & Evidence Update models.
 */

export class ExplainableFormulasEngine {
    /**
     * Calculates Replay Reproducibility Score S_replay = (sum w_i * M_i) / (sum w_i) * 100%
     */
    calculateReplayReproducibility(matches: {
        timelineMatched: boolean;
        messagingMatched: boolean;
        schedulerMatched: boolean;
        outputMatched: boolean;
    }): { scorePercent: number; formula: string; breakdown: Record<string, string> } {
        const wTimeline = 0.30;
        const wMessaging = 0.30;
        const wScheduler = 0.20;
        const wOutput = 0.20;

        const m1 = matches.timelineMatched ? 1.0 : 0.0;
        const m2 = matches.messagingMatched ? 1.0 : 0.0;
        const m3 = matches.schedulerMatched ? 1.0 : 0.0;
        const m4 = matches.outputMatched ? 1.0 : 0.0;

        const totalWeight = wTimeline + wMessaging + wScheduler + wOutput;
        const weightedSum = (wTimeline * m1) + (wMessaging * m2) + (wScheduler * m3) + (wOutput * m4);
        const scorePercent = Number(((weightedSum / totalWeight) * 100).toFixed(2));

        return {
            scorePercent,
            formula: "S_replay = (0.30*Timeline + 0.30*Messaging + 0.20*Scheduler + 0.20*Output) * 100%",
            breakdown: {
                Timeline: `${m1} (Weight ${wTimeline})`,
                Messaging: `${m2} (Weight ${wMessaging})`,
                Scheduler: `${m3} (Weight ${wScheduler})`,
                Output: `${m4} (Weight ${wOutput})`
            }
        };
    }

    /**
     * Calculates Complexity Score C = 0.4*Mesh + 0.3*Shader + 0.3*Deps
     * and ROI = ProjectedBenefit / ProjectedCost
     */
    calculateSchedulerComplexity(
        meshComplexity: number, // 0-100
        shaderComplexity: number, // 0-100
        depsComplexity: number, // 0-100
        projectedCost: number, // USD / Tokens
        projectedBenefit: number, // Value metric
        allocatedWorkers: number
    ): {
        complexityScore: number;
        roiRatio: number;
        expectedCompletionImprovementPercent: number;
        formula: string;
    } {
        const complexityScore = Number((0.40 * meshComplexity + 0.30 * shaderComplexity + 0.30 * depsComplexity).toFixed(2));
        const roiRatio = projectedCost > 0 ? Number((projectedBenefit / projectedCost).toFixed(2)) : 0;
        
        // Non-linear speedup formula with diminishing returns: Speedup = N / (1 + 0.4*N)
        const improvement = Math.min(95.0, (allocatedWorkers / (1.0 + 0.40 * allocatedWorkers)) * 80.0);
        const expectedCompletionImprovementPercent = Number(improvement.toFixed(1));

        return {
            complexityScore,
            roiRatio,
            expectedCompletionImprovementPercent,
            formula: "C = 0.4*Mesh + 0.3*Shader + 0.3*Deps | ROI = Benefit / Cost | Speedup = N / (1 + 0.4*N)"
        };
    }

    /**
     * Calculates Confidence Decay and Evidence Update: K(t) = K_0 * e^(-lambda * dt) + sum dK
     */
    calculateConfidenceDecay(
        initialConfidence: number,
        dtSteps: number,
        evidenceBoosts: number[] = []
    ): { finalConfidence: number; formula: string } {
        const lambda = 0.02; // Decay rate per step
        const decayed = initialConfidence * Math.exp(-lambda * dtSteps);
        const totalBoost = evidenceBoosts.reduce((a, b) => a + b, 0);
        const finalConfidence = Math.max(0, Math.min(1.0, Number((decayed + totalBoost).toFixed(4))));

        return {
            finalConfidence,
            formula: "K(t) = K_0 * e^(-0.02 * dt) + sum(dK_evidence)"
        };
    }
}

export const explainableFormulasEngine = new ExplainableFormulasEngine();
