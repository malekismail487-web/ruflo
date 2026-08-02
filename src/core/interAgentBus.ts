/**
 * Structured Inter-Agent Communication Bus
 * Handles peer messaging between autonomous agents with typed message events:
 * CHALLENGE, REBUTTAL, REQUEST, EVIDENCE_EXCHANGE, CORRECTION, APPROVAL.
 * Tracks correlation IDs, message throughput, and message resolution histories.
 */

export type PeerMessageType = 'CHALLENGE' | 'REBUTTAL' | 'REQUEST' | 'EVIDENCE_EXCHANGE' | 'CORRECTION' | 'APPROVAL';

export interface PeerMessage {
    messageId: string;
    correlationId: string;
    timestamp: string;
    senderId: string;
    receiverId: string;
    messageType: PeerMessageType;
    subject: string;
    payload: Record<string, unknown>;
    evidenceKeys?: string[];
}

export class InterAgentBus {
    private messageLog: PeerMessage[] = [];
    private messageListeners: Array<(msg: PeerMessage) => void> = [];

    /**
     * Send a peer message between agents
     */
    sendMessage(
        senderId: string,
        receiverId: string,
        messageType: PeerMessageType,
        subject: string,
        payload: Record<string, unknown>,
        correlationId?: string,
        evidenceKeys?: string[]
    ): PeerMessage {
        const msg: PeerMessage = {
            messageId: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            correlationId: correlationId || `corr-${Date.now()}`,
            timestamp: new Date().toISOString(),
            senderId,
            receiverId,
            messageType,
            subject,
            payload,
            evidenceKeys: evidenceKeys || []
        };

        this.messageLog.push(msg);
        this.messageListeners.forEach(listener => listener(msg));
        return msg;
    }

    onMessage(callback: (msg: PeerMessage) => void): void {
        this.messageListeners.push(callback);
    }

    getMessagesForAgent(agentId: string): PeerMessage[] {
        return this.messageLog.filter(m => m.senderId === agentId || m.receiverId === agentId);
    }

    getMessagesByCorrelationId(correlationId: string): PeerMessage[] {
        return this.messageLog.filter(m => m.correlationId === correlationId);
    }

    getAllMessages(): PeerMessage[] {
        return [...this.messageLog];
    }

    getStats(): { totalMessages: number; challengesCount: number; correctionsCount: number; approvalsCount: number } {
        let challengesCount = 0;
        let correctionsCount = 0;
        let approvalsCount = 0;

        for (const m of this.messageLog) {
            if (m.messageType === 'CHALLENGE') challengesCount++;
            if (m.messageType === 'CORRECTION') correctionsCount++;
            if (m.messageType === 'APPROVAL') approvalsCount++;
        }

        return {
            totalMessages: this.messageLog.length,
            challengesCount,
            correctionsCount,
            approvalsCount
        };
    }
}

export const interAgentBus = new InterAgentBus();
