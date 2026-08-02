export interface StrategyPerformanceStats {
    strategyName: string;
    totalRuns: number;
    successCount: number;
    averageCorrectionCount: number;
    compileSuccessRate: number;      // 0.0 to 1.0
    benchmarkImprovementFactor: number;
    architecturalStabilityScore: number; // 0.0 to 1.0
    regressionFrequency: number;     // 0.0 to 1.0
    computedScore: number;
}

export class StrategyEvolutionEngine {
    private statsMap: Map<string, StrategyPerformanceStats> = new Map();

    constructor() {
        // Initialize baseline historical strategies
        this.recordStrategyRun({
            strategyName: "Modular_Vulkan_VelocityVerlet",
            totalRuns: 10,
            successCount: 9,
            averageCorrectionCount: 0.2,
            compileSuccessRate: 0.95,
            benchmarkImprovementFactor: 1.45,
            architecturalStabilityScore: 0.98,
            regressionFrequency: 0.02
        });

        this.recordStrategyRun({
            strategyName: "Monolithic_OpenGL_NaiveEuler",
            totalRuns: 10,
            successCount: 4,
            averageCorrectionCount: 3.5,
            compileSuccessRate: 0.60,
            benchmarkImprovementFactor: 0.85,
            architecturalStabilityScore: 0.40,
            regressionFrequency: 0.35
        });
    }

    recordStrategyRun(stats: Omit<StrategyPerformanceStats, "computedScore">): StrategyPerformanceStats {
        const successRate = stats.totalRuns > 0 ? stats.successCount / stats.totalRuns : 0;
        const score = (successRate * 0.35) + (stats.compileSuccessRate * 0.25) + (stats.architecturalStabilityScore * 0.25) - (stats.regressionFrequency * 0.15);

        const fullStats: StrategyPerformanceStats = {
            ...stats,
            computedScore: Number(score.toFixed(4))
        };

        this.statsMap.set(stats.strategyName, fullStats);
        return fullStats;
    }

    selectBestStrategy(): StrategyPerformanceStats {
        let best: StrategyPerformanceStats | undefined = undefined;
        for (const stats of this.statsMap.values()) {
            if (!best || stats.computedScore > best.computedScore) {
                best = stats;
            }
        }
        return best!;
    }
}

export const strategyEvolutionEngine = new StrategyEvolutionEngine();
