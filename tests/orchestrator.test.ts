import { describe, it, expect, vi } from "vitest";
import { CoreAgentOrchestrator } from "../src/agents/orchestrator.js";
import { agentClient } from "../src/lib/agentHttpClient.js";

describe("CoreAgentOrchestrator Behavior & Data Contracts", () => {
    it("should capture actual data payloads returned by tool execution responses", async () => {
        const executeToolSpy = vi.spyOn(agentClient, "executeTool").mockImplementation(async (req) => {
            if (req.toolName === "psychometric_eval") {
                return { success: true, data: { promptComplexity: 2.5, updatedTheta: 0.25 }, executionTimeMs: 10 };
            }
            if (req.toolName === "emotional_state_tracker") {
                return { success: true, data: { currentState: "focused", confidence: 0.98 }, executionTimeMs: 12 };
            }
            if (req.toolName === "mistake_analyzer") {
                return { success: true, data: { rootCauseCategory: "RuntimeLogic" }, executionTimeMs: 15 };
            }
            return { success: true, data: { stored: true }, executionTimeMs: 8 };
        });

        const orchestrator = new CoreAgentOrchestrator("agent_behavior_test");
        const result = await orchestrator.executeAdaptiveLoop({
            taskPrompt: "Validate data propagation across HTTP gateway"
        });

        expect(result.success).toBe(true);
        expect(result.psychometricEval).toEqual({ promptComplexity: 2.5, updatedTheta: 0.25 });
        expect(result.cognitiveState).toEqual({ currentState: "focused", confidence: 0.98 });
        expect(result.mistakeAnalysis).toEqual({ rootCauseCategory: "RuntimeLogic" });
        expect(result.executionLogs).toContain("[Orchestrator] Adaptive cognitive loop finished successfully.");

        executeToolSpy.mockRestore();
    });

    it("should log structured warnings and continue execution when a tool returns non-fatal failure", async () => {
        const executeToolSpy = vi.spyOn(agentClient, "executeTool").mockImplementation(async (req) => {
            if (req.toolName === "psychometric_eval") {
                return { success: false, error: "API Gateway Error (502): Bad Gateway", executionTimeMs: 100 };
            }
            return { success: true, data: { ok: true }, executionTimeMs: 10 };
        });

        const orchestrator = new CoreAgentOrchestrator("agent_fault_test");
        const result = await orchestrator.executeAdaptiveLoop({
            taskPrompt: "Test fault tolerance boundary"
        });

        expect(result.success).toBe(true);
        expect(result.executionLogs.some(log => log.includes("API Gateway Error (502)"))).toBe(true);

        executeToolSpy.mockRestore();
    });
});
