/**
 * Isolated Agent Memory & Execution Context Module
 * Represents independent execution state for an agent (working memory, objectives,
 * evidence references, confidence history, decision summaries, pending work queue).
 * Enforces strict memory isolation to prevent unauthorized cross-agent mutation.
 */

export interface ConfidenceRecord {
    timestamp: string;
    score: number; // 0-1
    rationale: string;
}

export interface DecisionSummary {
    decisionId: string;
    timestamp: string;
    topic: string;
    outcome: string;
    justification: string;
    evidenceKeys: string[];
}

export class AgentMemoryContext {
    public readonly agentId: string;
    public readonly role: string;
    public readonly createdAt: string;

    private workingMemory: Map<string, unknown> = new Map();
    private assignedObjectives: string[] = [];
    private completedTasks: string[] = [];
    private evidenceReferences: Map<string, string> = new Map(); // key -> uri/evidence
    private confidenceHistory: ConfidenceRecord[] = [];
    private decisionSummaries: DecisionSummary[] = [];
    private pendingWorkQueue: string[] = [];

    constructor(agentId: string, role: string) {
        this.agentId = agentId;
        this.role = role;
        this.createdAt = new Date().toISOString();
    }

    /**
     * Set a private memory entry. Rejects external mutation attempts.
     */
    setPrivateMemory(callerAgentId: string, key: string, value: unknown): boolean {
        if (callerAgentId !== this.agentId) {
            throw new Error(`[MemoryViolation] Unauthorized memory mutation attempt on agent '${this.agentId}' by caller '${callerAgentId}'.`);
        }
        this.workingMemory.set(key, value);
        return true;
    }

    getPrivateMemory(key: string): unknown {
        return this.workingMemory.get(key);
    }

    addObjective(objective: string): void {
        this.assignedObjectives.push(objective);
    }

    markTaskCompleted(taskName: string): void {
        this.completedTasks.push(taskName);
        this.pendingWorkQueue = this.pendingWorkQueue.filter(t => t !== taskName);
    }

    addEvidenceReference(key: string, proof: string): void {
        this.evidenceReferences.set(key, proof);
    }

    recordConfidence(score: number, rationale: string): void {
        this.confidenceHistory.push({
            timestamp: new Date().toISOString(),
            score: Math.max(0, Math.min(1, score)),
            rationale
        });
    }

    recordDecision(topic: string, outcome: string, justification: string, evidenceKeys: string[]): void {
        this.decisionSummaries.push({
            decisionId: `dec-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            timestamp: new Date().toISOString(),
            topic,
            outcome,
            justification,
            evidenceKeys
        });
    }

    enqueueWorkItem(workItem: string): void {
        this.pendingWorkQueue.push(workItem);
    }

    getSnapshot(): {
        agentId: string;
        role: string;
        workingMemorySize: number;
        assignedObjectivesCount: number;
        completedTasksCount: number;
        evidenceCount: number;
        latestConfidence: number;
        decisionsCount: number;
        pendingWorkCount: number;
    } {
        const latestConf = this.confidenceHistory.length > 0
            ? this.confidenceHistory[this.confidenceHistory.length - 1].score
            : 1.0;

        return {
            agentId: this.agentId,
            role: this.role,
            workingMemorySize: this.workingMemory.size,
            assignedObjectivesCount: this.assignedObjectives.length,
            completedTasksCount: this.completedTasks.length,
            evidenceCount: this.evidenceReferences.size,
            latestConfidence: latestConf,
            decisionsCount: this.decisionSummaries.length,
            pendingWorkCount: this.pendingWorkQueue.length
        };
    }
}
