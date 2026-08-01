import { agentClient, ToolExecutionResponse } from "../lib/agentHttpClient.js";

export interface AgentTaskRequest {
    taskPrompt: string;
    agentId?: string;
    context?: Record<string, unknown>;
}

export interface OrchestrationResult {
    taskPrompt: string;
    psychometricEval?: Record<string, unknown>;
    cognitiveState?: Record<string, unknown>;
    mistakeAnalysis?: Record<string, unknown>;
    executionLogs: string[];
    success: boolean;
    error?: string;
}

export class CoreAgentOrchestrator {
    private agentId: string;

    constructor(agentId: string = "core_orchestrator_main") {
        this.agentId = agentId;
    }

    /**
     * Executes the adaptive cognitive loop entirely via remote HTTP API calls (`agentClient.executeTool`).
     * Direct local MCP bindings and in-process tool executions have been severed.
     */
    async executeAdaptiveLoop(request: AgentTaskRequest): Promise<OrchestrationResult> {
        const logs: string[] = [];
        logs.push(`[Orchestrator] Initiating adaptive loop for prompt: "${request.taskPrompt.slice(0, 40)}..."`);

        // 1. Execute Psychometric Evaluation tool via Gateway
        logs.push("[Orchestrator] Requesting psychometric_eval via agentClient...");
        const psychometricResponse: ToolExecutionResponse = await agentClient.executeTool({
            toolName: "psychometric_eval",
            parameters: {
                prompt: request.taskPrompt,
                difficulty: 1.0,
                success: 1
            },
            context: request.context
        });

        if (!psychometricResponse.success) {
            logs.push(`[Warning] Psychometric eval returned non-fatal error: ${psychometricResponse.error}`);
        } else {
            logs.push(`[Orchestrator] Psychometric eval completed in ${psychometricResponse.executionTimeMs}ms`);
        }

        // 2. Track Emotional/Cognitive State tool via Gateway
        logs.push("[Orchestrator] Requesting emotional_state_tracker via agentClient...");
        const stateResponse: ToolExecutionResponse = await agentClient.executeTool({
            toolName: "emotional_state_tracker",
            parameters: {
                state: "focused",
                taskPrompt: request.taskPrompt
            }
        });

        if (!stateResponse.success) {
            logs.push(`[Warning] State tracker returned non-fatal error: ${stateResponse.error}`);
        }

        // 3. Analyze potential risks/mistakes tool via Gateway
        logs.push("[Orchestrator] Requesting mistake_analyzer via agentClient...");
        const mistakeResponse: ToolExecutionResponse = await agentClient.executeTool({
            toolName: "mistake_analyzer",
            parameters: {
                errorTrace: request.taskPrompt
            }
        });

        if (!mistakeResponse.success) {
            logs.push(`[Warning] Mistake analyzer returned non-fatal error: ${mistakeResponse.error}`);
        }

        // 4. Store loop trajectory in memory store via Gateway
        logs.push("[Orchestrator] Storing cognitive state trajectory via memory_store...");
        await agentClient.executeTool({
            toolName: "memory_store",
            parameters: {
                key: `traj_${this.agentId}_${Date.now()}`,
                value: {
                    prompt: request.taskPrompt,
                    psychometric: psychometricResponse.data,
                    state: stateResponse.data
                }
            }
        });

        logs.push("[Orchestrator] Adaptive cognitive loop finished successfully.");

        return {
            taskPrompt: request.taskPrompt,
            psychometricEval: psychometricResponse.data as Record<string, unknown>,
            cognitiveState: stateResponse.data as Record<string, unknown>,
            mistakeAnalysis: mistakeResponse.data as Record<string, unknown>,
            executionLogs: logs,
            success: true
        };
    }
}
