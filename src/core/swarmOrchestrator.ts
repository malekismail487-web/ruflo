import { agentFactory, AgentConfig } from "./agentFactory.js";
import { unifiedEventBus, LogEntry } from "./unifiedEventBus.js";
import { mandatoryTriadManager } from "./mandatoryTriad.js";
import { errorRebuilderEngine, RebuildTaskResult } from "./errorRebuilder.js";

export interface SwarmExecutionSummary {
    projectName: string;
    totalAgentsCreated: number;
    agentsList: { id: string; roleName: string; enableTracking: boolean }[];
    advisorConsensusApproved: boolean;
    trajectoryDriftPercent: number;
    correctionsIssuedCount: number;
    rebuildsExecutedCount: number;
    logsCount: number;
}

export class SwarmOrchestrator {
    private isSplittingPhaseComplete: boolean = false;
    private parentAgents: AgentConfig[] = [];
    private workerAgents: AgentConfig[] = [];
    private trackingSubscriptions: (() => void)[] = [];

    /**
     * Phase 1: Splitting Phase
     * Dynamically synthesizes abstract parent agents based on project requirements,
     * initializes mandatory Triad, and sets up continuous public log tracking.
     */
    initiateSplittingPhase(projectName: string, requiredRoles: string[]): {
        triad: ReturnType<typeof mandatoryTriadManager.getTriadAgents>;
        parents: AgentConfig[];
    } {
        unifiedEventBus.emitLog(
            "lead_ai_coder",
            "Lead_AI_Coder",
            "ACTION",
            `Initiating Agent Splitting Phase for project '${projectName}'. Mandatory Triad & Dynamic Parents spawning...`
        );

        const triad = mandatoryTriadManager.getTriadAgents();

        // Dynamically synthesize abstract parent agents
        this.parentAgents = requiredRoles.map(role => {
            const agent = agentFactory.createAgent(
                role,
                `Dynamic Parent Agent responsible for ${role} in project '${projectName}'.`,
                ["code_synthesis", "architecture_design"],
                undefined,
                [projectName]
            );

            // Enable Continuous Public Log Tracking Feature for each agent
            const unsubscribe = unifiedEventBus.subscribeTracking((entry: LogEntry) => {
                this.handleAgentTrackingEvent(agent, entry);
            });
            this.trackingSubscriptions.push(unsubscribe);

            unifiedEventBus.emitLog(
                agent.id,
                agent.roleName,
                "ALIGNMENT",
                `Agent '${agent.roleName}' initialized with continuous public log tracking enabled.`
            );

            return agent;
        });

        this.isSplittingPhaseComplete = true;
        return { triad, parents: this.parentAgents };
    }

    /**
     * Continuous Tracking Feature Handler:
     * Monitors public logs, aligns direction towards common goals, and triggers instant peer corrections.
     */
    private handleAgentTrackingEvent(agent: AgentConfig, entry: LogEntry) {
        // Skip self-generated logs
        if (entry.agentId === agent.id) return;

        // 1. Directional Alignment Tracking: Check if peers are working on alignment
        if (entry.type === "ALIGNMENT" || entry.type === "ACTION") {
            // Agent aligns direction towards shared peer activity
        }

        // 2. Instant Error Detection & Correction: If a peer makes a mistake, highlight error and propose fix
        if (entry.type === "ERROR_DETECTED" && entry.agentId !== agent.id) {
            const highlightedError = entry.message;
            const proposedFix = `Refactor '${entry.targetComponent || 'component'}' to conform to strict type contracts and modular isolation.`;

            unifiedEventBus.emitLog(
                agent.id,
                agent.roleName,
                "CORRECTION_ISSUED",
                `[INSTANT TRACKING CORRECTION] Agent '${agent.roleName}' detected error in peer log from '${entry.roleName}'. Highlighted error: "${highlightedError}"`,
                {
                    targetComponent: entry.targetComponent || "core_module",
                    highlightedError,
                    proposedFix
                }
            );

            // Automatically trigger targeted rebuild
            errorRebuilderEngine.spawnAndExecuteRebuild(
                entry.targetComponent || "core_module",
                highlightedError,
                proposedFix
            );
        }
    }

    /**
     * Phase 2: Hierarchical Replication
     * Parent agents request self-replication into specialized worker nodes.
     */
    replicateWorkerAgent(parentAgentId: string, subRoleSuffix: string, focusGoal: string): AgentConfig {
        const worker = agentFactory.replicateAgent(parentAgentId, subRoleSuffix, focusGoal);
        this.workerAgents.push(worker);

        // Attach continuous public log tracking to replicated worker
        const unsubscribe = unifiedEventBus.subscribeTracking((entry: LogEntry) => {
            this.handleAgentTrackingEvent(worker, entry);
        });
        this.trackingSubscriptions.push(unsubscribe);

        unifiedEventBus.emitLog(
            worker.id,
            worker.roleName,
            "ALIGNMENT",
            `Replicated subagent '${worker.roleName}' activated. Goal: '${focusGoal}'. Public log tracking active.`
        );

        return worker;
    }

    /**
     * Phase 3: Execute Swarm Build Scenario with Advisor Consensus Gate
     */
    async executeSwarmBuildScenario(
        projectName: string,
        architecturalPlan: string,
        plannedComponentsCount: number,
        actualComponentsCount: number
    ): Promise<SwarmExecutionSummary> {
        if (!this.isSplittingPhaseComplete) {
            throw new Error("Cannot execute build before completing Splitting Phase.");
        }

        // 1. Advisor Consensus Gate
        const consensus = mandatoryTriadManager.requestAdvisorConsensus(architecturalPlan);
        if (!consensus.approved) {
            throw new Error(`Lead AI Coder HALTED by Advisor Agent: ${consensus.guidance}`);
        }

        // 2. Lead AI Coder & Parent Agents Execute Tasks
        unifiedEventBus.emitLog(
            "lead_ai_coder",
            "Lead_AI_Coder",
            "ACTION",
            `Advisor Consensus APPROVED. Lead AI Coder executing multi-agent build for '${projectName}'...`
        );

        for (const parent of this.parentAgents) {
            unifiedEventBus.emitLog(
                parent.id,
                parent.roleName,
                "ACTION",
                `Parent agent '${parent.roleName}' constructed modular component for '${projectName}'.`
            );
        }

        // 3. Verifier Trajectory Drift Calculation
        const trajectory = mandatoryTriadManager.calculateTrajectoryDrift(plannedComponentsCount, actualComponentsCount);

        // 4. Researcher Async Background Survey
        mandatoryTriadManager.conductAsyncResearch(projectName);

        const allAgents = agentFactory.listAgents();
        const logs = unifiedEventBus.getLogHistory();

        const correctionsIssuedCount = logs.filter(l => l.type === "CORRECTION_ISSUED").length;
        const rebuildsExecutedCount = logs.filter(l => l.message.includes("Excised")).length;

        return {
            projectName,
            totalAgentsCreated: allAgents.length,
            agentsList: allAgents.map(a => ({ id: a.id, roleName: a.roleName, enableTracking: a.enableTracking })),
            advisorConsensusApproved: consensus.approved,
            trajectoryDriftPercent: trajectory.driftPercent,
            correctionsIssuedCount,
            rebuildsExecutedCount,
            logsCount: logs.length
        };
    }
}

export const swarmOrchestrator = new SwarmOrchestrator();
