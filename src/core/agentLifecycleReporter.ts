/**
 * Agent Lifecycle Reporter Module
 * Automatically records and formats lifecycle reports for every spawned agent:
 * creation time, specialization, assigned tasks, completed work, messages exchanged,
 * corrections issued/received, confidence trend, execution duration, and retirement reasons.
 */

export interface AgentLifecycleRecord {
    agentId: string;
    specialization: string;
    createdAt: string;
    retiredAt?: string;
    executionDurationMs: number;
    assignedTasks: string[];
    completedWork: string[];
    messagesExchangedCount: number;
    correctionsIssuedCount: number;
    correctionsReceivedCount: number;
    confidenceTrend: number[]; // e.g. [0.90, 0.92, 0.95]
    retirementReason: string;
    status: 'ACTIVE' | 'RETIRED_SUCCESS' | 'RETIRED_FAILURE';
}

export class AgentLifecycleReporter {
    private lifecycles: Map<string, AgentLifecycleRecord> = new Map();

    registerSpawn(agentId: string, specialization: string, initialTasks: string[] = []): AgentLifecycleRecord {
        const record: AgentLifecycleRecord = {
            agentId,
            specialization,
            createdAt: new Date().toISOString(),
            executionDurationMs: 0,
            assignedTasks: [...initialTasks],
            completedWork: [],
            messagesExchangedCount: 0,
            correctionsIssuedCount: 0,
            correctionsReceivedCount: 0,
            confidenceTrend: [0.90],
            retirementReason: "ACTIVE_EXECUTING",
            status: 'ACTIVE'
        };
        this.lifecycles.set(agentId, record);
        return record;
    }

    recordTaskCompletion(agentId: string, workName: string): void {
        const rec = this.lifecycles.get(agentId);
        if (rec) {
            rec.completedWork.push(workName);
        }
    }

    recordMessageEvent(agentId: string, isCorrectionIssued: boolean = false, isCorrectionReceived: boolean = false): void {
        const rec = this.lifecycles.get(agentId);
        if (rec) {
            rec.messagesExchangedCount++;
            if (isCorrectionIssued) rec.correctionsIssuedCount++;
            if (isCorrectionReceived) rec.correctionsReceivedCount++;
        }
    }

    updateConfidence(agentId: string, score: number): void {
        const rec = this.lifecycles.get(agentId);
        if (rec) {
            rec.confidenceTrend.push(Number(score.toFixed(4)));
        }
    }

    retireAgent(agentId: string, reason: string = "TASK_COMPLETED_SUCCESS", status: 'RETIRED_SUCCESS' | 'RETIRED_FAILURE' = 'RETIRED_SUCCESS'): AgentLifecycleRecord | undefined {
        const rec = this.lifecycles.get(agentId);
        if (rec) {
            rec.retiredAt = new Date().toISOString();
            const startMs = new Date(rec.createdAt).getTime();
            rec.executionDurationMs = Date.now() - startMs;
            rec.retirementReason = reason;
            rec.status = status;
        }
        return rec;
    }

    getRecord(agentId: string): AgentLifecycleRecord | undefined {
        return this.lifecycles.get(agentId);
    }

    getAllRecords(): AgentLifecycleRecord[] {
        return Array.from(this.lifecycles.values());
    }

    generateMarkdownSummaryTable(): string {
        let md = `| Agent ID | Specialization | Assigned / Completed | Msgs (Issued/Recv Corr) | Conf Trend | Duration | Status / Reason |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        for (const r of this.lifecycles.values()) {
            const confStr = r.confidenceTrend.join(" -> ");
            md += `| **${r.agentId}** | ${r.specialization} | ${r.assignedTasks.length} / ${r.completedWork.length} | ${r.messagesExchangedCount} (${r.correctionsIssuedCount}/${r.correctionsReceivedCount}) | ${confStr} | ${r.executionDurationMs}ms | ${r.status} (${r.retirementReason}) |\n`;
        }

        return md;
    }
}

export const agentLifecycleReporter = new AgentLifecycleReporter();
