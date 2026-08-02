/**
 * Dynamic Agent Factory & API Key Injector
 * Dynamically synthesizes abstract parent and worker agents with custom system prompts,
 * tool access, API credentials, and the continuous public log tracking feature.
 */

export interface AgentConfig {
    id: string;
    roleName: string;
    parentAgentId?: string;
    systemPrompt: string;
    assignedTools: string[];
    apiKey: string;
    enableTracking: boolean;
    trackingTargetGoals: string[];
    capabilities: string[];
}

export class AgentFactory {
    private activeAgents: Map<string, AgentConfig> = new Map();

    /**
     * Synthesizes a new abstract agent dynamically with injected credentials & tracking.
     */
    createAgent(
        roleName: string,
        systemPrompt: string,
        assignedTools: string[] = [],
        parentAgentId?: string,
        trackingTargetGoals: string[] = []
    ): AgentConfig {
        const id = `agent_${roleName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const apiKey = process.env.NVIDIA_API_KEY || process.env.PSYCHOMETRIC_API_KEY || "ale_live_EFHs4BuU8wPyejRBi3VYZ1lSLnaaTJKlJv6HZiwem0o";

        const config: AgentConfig = {
            id,
            roleName,
            parentAgentId,
            systemPrompt: `${systemPrompt}\n\n[MANDATORY TRACKING DIRECTIVE] Monitor the public event bus continuously. Maintain directional alignment with peer agents and immediately highlight and propose fixes for any peer errors detected.`,
            assignedTools: ["unified_log_read", "unified_log_emit", "peer_correct", ...assignedTools],
            apiKey,
            enableTracking: true,
            trackingTargetGoals,
            capabilities: ["dynamic_splitting", "peer_correction", "public_log_tracking"]
        };

        this.activeAgents.set(id, config);
        return config;
    }

    /**
     * Replicates an existing agent into a subagent worker node.
     */
    replicateAgent(parentAgentId: string, subRoleSuffix: string, specificFocusGoal: string): AgentConfig {
        const parent = this.activeAgents.get(parentAgentId);
        const parentRole = parent ? parent.roleName : "ParentAgent";
        
        return this.createAgent(
            `${parentRole}_Worker_${subRoleSuffix}`,
            `Replicated worker agent derived from ${parentRole}. Focus: ${specificFocusGoal}`,
            parent ? parent.assignedTools : [],
            parentAgentId,
            parent ? [...parent.trackingTargetGoals, specificFocusGoal] : [specificFocusGoal]
        );
    }

    getAgent(id: string): AgentConfig | undefined {
        return this.activeAgents.get(id);
    }

    listAgents(): AgentConfig[] {
        return Array.from(this.activeAgents.values());
    }
}

export const agentFactory = new AgentFactory();
