import { unifiedEventBus, LogEntry } from "./unifiedEventBus.js";

export type CrossAgentDomainType = "ARCHITECT" | "GRAPHICS" | "PHYSICS" | "SECURITY" | "NETWORKING" | "VERIFIER" | "RESEARCHER";

export interface CrossAgentCorrectionEvent {
    id: string;
    timestamp: string;
    sourceAgentId: string;
    sourceDomain: CrossAgentDomainType;
    targetAgentId: string;
    targetDomain: CrossAgentDomainType;
    targetComponent: string;
    highlightedError: string;
    proposedFix: string;
    accepted: boolean;
}

export class CrossAgentCollaborationEngine {
    private correctionsHistory: CrossAgentCorrectionEvent[] = [];

    /**
     * Issues a first-class cross-agent domain challenge or correction.
     */
    issueCrossAgentCorrection(
        sourceAgentId: string,
        sourceDomain: CrossAgentDomainType,
        targetAgentId: string,
        targetDomain: CrossAgentDomainType,
        targetComponent: string,
        highlightedError: string,
        proposedFix: string
    ): CrossAgentCorrectionEvent {
        const timestamp = new Date().toISOString();
        const id = `cross_corr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const event: CrossAgentCorrectionEvent = {
            id,
            timestamp,
            sourceAgentId,
            sourceDomain,
            targetAgentId,
            targetDomain,
            targetComponent,
            highlightedError,
            proposedFix,
            accepted: true // Automatically acknowledged and resolved by target agent
        };

        this.correctionsHistory.push(event);

        // Emit first-class event to unified event bus
        unifiedEventBus.emitLog(
            sourceAgentId,
            `${sourceDomain}_Lead`,
            "CORRECTION_ISSUED",
            `[CROSS-AGENT COLLABORATION] ${sourceDomain} Lead challenged ${targetDomain} Lead on '${targetComponent}': "${highlightedError}" -> Proposed Fix: "${proposedFix}"`,
            {
                targetComponent,
                highlightedError,
                proposedFix
            }
        );

        return event;
    }

    getHistory(): CrossAgentCorrectionEvent[] {
        return [...this.correctionsHistory];
    }
}

export const crossAgentCollaborationEngine = new CrossAgentCollaborationEngine();
