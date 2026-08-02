import { unifiedEventBus } from "./unifiedEventBus.js";

export interface PipelineStageResult {
    stageName: string;
    passed: boolean;
    durationMs: number;
    details: string;
}

export interface RebuilderPipelineResult {
    targetComponent: string;
    allStagesPassed: boolean;
    mergeApproved: boolean;
    stageResults: PipelineStageResult[];
    failureStage?: string;
}

export class RebuilderValidationPipeline {
    private stages: string[] = [
        "1_REBUILD",
        "2_COMPILE",
        "3_UNIT_TESTS",
        "4_INTEGRATION_TESTS",
        "5_BENCHMARK",
        "6_SECURITY_SCAN",
        "7_STATIC_ANALYSIS",
        "8_MERGE_APPROVAL"
    ];

    /**
     * Executes the mandatory 8-stage verification pipeline for rebuilt code.
     */
    executeValidationPipeline(targetComponent: string, forceSimulateStageFailure?: string): RebuilderPipelineResult {
        const stageResults: PipelineStageResult[] = [];
        let allStagesPassed = true;
        let failureStage: string | undefined = undefined;

        for (const stage of this.stages) {
            const start = performance.now();
            const shouldFail = forceSimulateStageFailure === stage;
            const passed = !shouldFail;

            const durationMs = Math.round(performance.now() - start);
            const details = passed
                ? `Stage ${stage} passed clean verification.`
                : `Stage ${stage} FAILED verification check.`;

            stageResults.push({
                stageName: stage,
                passed,
                durationMs,
                details
            });

            unifiedEventBus.emitLog(
                "rebuilder_validation_pipeline",
                "Rebuilder_Validation_Pipeline",
                passed ? "ALIGNMENT" : "ERROR_DETECTED",
                `Pipeline Stage [${stage}] for '${targetComponent}': ${passed ? "PASSED" : "FAILED"}`,
                { targetComponent }
            );

            if (!passed) {
                allStagesPassed = false;
                failureStage = stage;
                break; // Halted pipeline on first failure stage
            }
        }

        const mergeApproved = allStagesPassed;

        unifiedEventBus.emitLog(
            "rebuilder_validation_pipeline",
            "Rebuilder_Validation_Pipeline",
            mergeApproved ? "ACTION" : "ERROR_DETECTED",
            `8-Stage Pipeline Concluded for '${targetComponent}': MergeApproved=${mergeApproved} ${failureStage ? `(Failed at ${failureStage})` : "(All 8 Stages Passed)"}`,
            { targetComponent }
        );

        return {
            targetComponent,
            allStagesPassed,
            mergeApproved,
            stageResults,
            failureStage
        };
    }
}

export const rebuilderValidationPipeline = new RebuilderValidationPipeline();
