/**
 * Gantt Concurrency Timeline Engine Module
 * Records agent execution windows (start time, finish time, active state, task assigned)
 * and generates Mermaid Gantt charts proving genuine concurrent execution timelines.
 */

export interface AgentExecutionWindow {
    agentId: string;
    role: string;
    taskName: string;
    startTimeMs: number;
    finishTimeMs: number;
    durationMs: number;
    status: 'COMPLETED' | 'RUNNING' | 'RETIRED';
}

export class GanttTimelineEngine {
    private executionWindows: AgentExecutionWindow[] = [];
    private sessionStartTime = Date.now();

    recordStart(agentId: string, role: string, taskName: string): void {
        this.executionWindows.push({
            agentId,
            role,
            taskName,
            startTimeMs: Date.now() - this.sessionStartTime,
            finishTimeMs: 0,
            durationMs: 0,
            status: 'RUNNING'
        });
    }

    recordFinish(agentId: string, taskName: string): void {
        const window = this.executionWindows.find(w => w.agentId === agentId && w.taskName === taskName && w.status === 'RUNNING');
        if (window) {
            window.finishTimeMs = Date.now() - this.sessionStartTime;
            window.durationMs = window.finishTimeMs - window.startTimeMs;
            window.status = 'COMPLETED';
        }
    }

    recordRetire(agentId: string): void {
        this.executionWindows.filter(w => w.agentId === agentId && w.status === 'RUNNING').forEach(w => {
            w.finishTimeMs = Date.now() - this.sessionStartTime;
            w.durationMs = w.finishTimeMs - w.startTimeMs;
            w.status = 'RETIRED';
        });
    }

    getConcurrencyOverlapStats(): { totalWindows: number; peakConcurrentCount: number; maxOverlapMs: number } {
        if (this.executionWindows.length === 0) return { totalWindows: 0, peakConcurrentCount: 0, maxOverlapMs: 0 };

        let maxConcurrent = 0;
        let maxOverlapMs = 0;

        for (const w1 of this.executionWindows) {
            let activeAtStart = 0;
            for (const w2 of this.executionWindows) {
                const w1End = w1.finishTimeMs || (Date.now() - this.sessionStartTime);
                const w2End = w2.finishTimeMs || (Date.now() - this.sessionStartTime);
                if (w2.startTimeMs <= w1.startTimeMs && w2End >= w1.startTimeMs) {
                    activeAtStart++;
                }
                const overlapStart = Math.max(w1.startTimeMs, w2.startTimeMs);
                const overlapEnd = Math.min(w1End, w2End);
                if (w1.agentId !== w2.agentId && overlapEnd > overlapStart) {
                    maxOverlapMs = Math.max(maxOverlapMs, overlapEnd - overlapStart);
                }
            }
            maxConcurrent = Math.max(maxConcurrent, activeAtStart);
        }

        return {
            totalWindows: this.executionWindows.length,
            peakConcurrentCount: maxConcurrent,
            maxOverlapMs
        };
    }

    generateMermaidGanttChart(): string {
        let gantt = `gantt\n    title Swarm Agent Concurrent Execution Timeline\n    dateFormat  SS\n    axisFormat %S sec\n\n`;

        const groups = new Map<string, AgentExecutionWindow[]>();
        for (const w of this.executionWindows) {
            if (!groups.has(w.role)) groups.set(w.role, []);
            groups.get(w.role)!.push(w);
        }

        for (const [role, windows] of groups.entries()) {
            gantt += `    section ${role}\n`;
            for (const w of windows) {
                const startSec = (w.startTimeMs / 1000).toFixed(1);
                const endSec = (w.finishTimeMs / 1000).toFixed(1);
                gantt += `    ${w.agentId} (${w.taskName}) :active, ${startSec}s, ${endSec}s\n`;
            }
        }

        return gantt;
    }
}

export const ganttTimelineEngine = new GanttTimelineEngine();
