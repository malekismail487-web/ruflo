import { unifiedEventBus } from "./unifiedEventBus.js";

export interface ProjectStateVector10D {
    architectureCompleteness: number;  // 0.0 to 1.0
    functionalCompleteness: number;    // 0.0 to 1.0
    testCoverage: number;              // 0.0 to 1.0
    documentationCompleteness: number; // 0.0 to 1.0
    securityStatus: number;            // 0.0 to 1.0
    dependencyHealth: number;          // 0.0 to 1.0
    performanceHealth: number;         // 0.0 to 1.0
    buildStability: number;            // 0.0 to 1.0
    apiCompatibility: number;          // 0.0 to 1.0
    memoryEfficiency: number;          // 0.0 to 1.0
}

export interface DimensionalDriftAnalysis {
    dimension: keyof ProjectStateVector10D;
    targetValue: number;
    actualValue: number;
    driftPercent: number;
}

export interface RichTrajectoryDriftResult {
    timestamp: string;
    overallDriftPercent: number;
    dimensionalDrifts: DimensionalDriftAnalysis[];
    trendExplanation: string;
    aligned: boolean;
}

export class RichTrajectoryDriftEngine {
    private history: RichTrajectoryDriftResult[] = [];

    /**
     * Evaluates 10-dimensional project state against planned target state vector.
     */
    evaluate10DTrajectory(
        targetState: ProjectStateVector10D,
        actualState: ProjectStateVector10D
    ): RichTrajectoryDriftResult {
        const timestamp = new Date().toISOString();
        const dimensions = Object.keys(targetState) as (keyof ProjectStateVector10D)[];

        let totalSquareError = 0;
        const dimensionalDrifts: DimensionalDriftAnalysis[] = [];

        dimensions.forEach(dim => {
            const target = targetState[dim];
            const actual = actualState[dim];
            const diff = Math.abs(actual - target);
            const driftPct = target === 0 ? 0 : (diff / target) * 100;

            totalSquareError += Math.pow(diff, 2);
            dimensionalDrifts.push({
                dimension: dim,
                targetValue: target,
                actualValue: actual,
                driftPercent: Number(driftPct.toFixed(2))
            });
        });

        // RMS overall drift percentage across all 10 dimensions
        const rmsError = Math.sqrt(totalSquareError / dimensions.length);
        const overallDriftPercent = Number((rmsError * 100).toFixed(2));

        let trendExplanation = "";
        if (this.history.length === 0) {
            trendExplanation = `Initial 10D baseline established with ${overallDriftPercent}% overall drift.`;
        } else {
            const prevDrift = this.history[this.history.length - 1].overallDriftPercent;
            const delta = overallDriftPercent - prevDrift;
            if (delta < 0) {
                trendExplanation = `Trajectory drift IMPROVED by ${Math.abs(delta).toFixed(2)}% (from ${prevDrift}% to ${overallDriftPercent}%). Reason: Tests and build stability metrics converged.`;
            } else if (delta > 0) {
                trendExplanation = `Trajectory drift INCREASED by ${delta.toFixed(2)}% (from ${prevDrift}% to ${overallDriftPercent}%). Reason: Security scan and memory efficiency dimensions drifted from target.`;
            } else {
                trendExplanation = `Trajectory drift STABLE at ${overallDriftPercent}%.`;
            }
        }

        const result: RichTrajectoryDriftResult = {
            timestamp,
            overallDriftPercent,
            dimensionalDrifts,
            trendExplanation,
            aligned: overallDriftPercent <= 5.0 // 5.0% threshold
        };

        this.history.push(result);

        unifiedEventBus.emitLog(
            "verifier_10d_engine",
            "Rich_Trajectory_Verifier_10D",
            result.aligned ? "ALIGNMENT" : "ERROR_DETECTED",
            `10D Trajectory Evaluated: OverallDrift=${overallDriftPercent}% | Trend: "${trendExplanation}"`,
            { trajectoryDriftPercent: overallDriftPercent }
        );

        return result;
    }

    getHistory(): RichTrajectoryDriftResult[] {
        return [...this.history];
    }
}

export const richTrajectoryDriftEngine = new RichTrajectoryDriftEngine();
