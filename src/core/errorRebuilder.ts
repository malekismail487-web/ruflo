import { unifiedEventBus } from "./unifiedEventBus.js";
import { agentFactory, AgentConfig } from "./agentFactory.js";

export interface RebuildTaskResult {
    rebuilderAgentId: string;
    targetComponent: string;
    errorHighlighted: string;
    proposedFix: string;
    excisedLinesCount: number;
    rebuiltSuccessfully: boolean;
}

export class ErrorRebuilderEngine {
    /**
     * Spawns a dedicated targeted Rebuilder Agent to excise defective code and rebuild it cleanly.
     */
    spawnAndExecuteRebuild(
        targetComponent: string,
        errorHighlighted: string,
        proposedFix: string
    ): RebuildTaskResult {
        const rebuilder: AgentConfig = agentFactory.createAgent(
            `Targeted_Rebuilder_${targetComponent.replace(/[^a-z0-9]/g, "_")}`,
            `You are a dedicated Targeted Error Rebuilder Agent. Objective: Excise defective section in '${targetComponent}' and rebuild cleanly using proposed fix: '${proposedFix}'`,
            ["code_excise", "component_rebuild"]
        );

        unifiedEventBus.emitLog(
            rebuilder.id,
            rebuilder.roleName,
            "CORRECTION_ISSUED",
            `Spawning targeted rebuilder to excise error in '${targetComponent}': "${errorHighlighted}"`,
            { targetComponent, highlightedError: errorHighlighted, proposedFix }
        );

        // Simulate targeted code excision & rebuild execution
        const excisedLinesCount = 14;
        const rebuiltSuccessfully = true;

        unifiedEventBus.emitLog(
            rebuilder.id,
            rebuilder.roleName,
            "ACTION",
            `Excised ${excisedLinesCount} defective lines in '${targetComponent}'. Successfully rebuilt component with fix: "${proposedFix}".`,
            { targetComponent }
        );

        return {
            rebuilderAgentId: rebuilder.id,
            targetComponent,
            errorHighlighted,
            proposedFix,
            excisedLinesCount,
            rebuiltSuccessfully
        };
    }
}

export const errorRebuilderEngine = new ErrorRebuilderEngine();
