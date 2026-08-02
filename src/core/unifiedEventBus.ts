/**
 * Unified Real-Time Shared Event Bus & Peer Tracking Engine
 * Provides append-only log visibility across all parent and descendant agents,
 * enabling real-time directional tracking, error detection, and instant peer correction.
 */

export interface LogEntry {
    id: string;
    timestamp: string;
    agentId: string;
    roleName: string;
    type: "ACTION" | "ALIGNMENT" | "ERROR_DETECTED" | "CORRECTION_ISSUED" | "ADVISOR_GATE";
    message: string;
    targetComponent?: string;
    trajectoryDriftPercent?: number;
    highlightedError?: string;
    proposedFix?: string;
}

export type LogListener = (entry: LogEntry) => void;

export class UnifiedEventBus {
    private logs: LogEntry[] = [];
    private listeners: Set<LogListener> = new Set();

    /**
     * Appends an entry to the unified public log and notifies all active tracking agents instantly.
     */
    emitLog(
        agentId: string,
        roleName: string,
        type: LogEntry["type"],
        message: string,
        metadata?: {
            targetComponent?: string;
            trajectoryDriftPercent?: number;
            highlightedError?: string;
            proposedFix?: string;
        }
    ): LogEntry {
        const entry: LogEntry = {
            id: `log_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            timestamp: new Date().toISOString(),
            agentId,
            roleName,
            type,
            message,
            ...metadata
        };

        this.logs.push(entry);

        // Instantly broadcast to all active agent tracking listeners (sub-millisecond latency)
        for (const listener of this.listeners) {
            try {
                listener(entry);
            } catch (err) {
                console.error(`Tracking listener error for agent ${agentId}:`, err);
            }
        }

        return entry;
    }

    /**
     * Subscribes an agent's tracking feature to the live public log stream.
     */
    subscribeTracking(listener: LogListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Gets the full shared log history.
     */
    getLogHistory(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Scans log history for peer trajectory alignment and error correction triggers.
     */
    scanPeerTracking(agentId: string): {
        peerDirections: string[];
        unresolvedErrors: LogEntry[];
        activeCorrections: LogEntry[];
    } {
        const peerLogs = this.logs.filter(l => l.agentId !== agentId);
        const peerDirections = peerLogs
            .filter(l => l.type === "ALIGNMENT" || l.type === "ACTION")
            .map(l => `[${l.roleName}] ${l.message}`);

        const unresolvedErrors = peerLogs.filter(l => l.type === "ERROR_DETECTED");
        const activeCorrections = peerLogs.filter(l => l.type === "CORRECTION_ISSUED");

        return { peerDirections, unresolvedErrors, activeCorrections };
    }
}

export const unifiedEventBus = new UnifiedEventBus();
