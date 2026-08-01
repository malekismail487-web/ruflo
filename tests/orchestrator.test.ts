import { describe, it, expect, vi } from "vitest";
import { CoreAgentOrchestrator } from "../src/agents/orchestrator.js";
import { agentClient } from "../src/lib/agentHttpClient.js";

describe("CoreAgentOrchestrator Decoupled Execution", () => {
    it("should execute adaptive cognitive loop via remote HTTP tool calls without local MCP bindings", async () => {
        const executeToolSpy = vi.spyOn(agentClient, "executeTool").mockImplementation(async (req) => {
            return {
                success: true,
                data: { toolExecuted: req.toolName, mockData: "ok" },
                executionTimeMs: 12
            };
        });

        const orchestrator = new CoreAgentOrchestrator("test_agent_1");
        const result = await orchestrator.executeAdaptiveLoop({
            taskPrompt: "Refactor architecture into decoupled HTTP gateway"
        });

        expect(result.success).toBe(true);
        expect(executeToolSpy).toHaveBeenCalledTimes(4); // psychometric_eval, emotional_state_tracker, mistake_analyzer, memory_store
        expect(executeToolSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({ toolName: "psychometric_eval" }));
        expect(executeToolSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ toolName: "emotional_state_tracker" }));
        expect(executeToolSpy).toHaveBeenNthCalledWith(3, expect.objectContaining({ toolName: "mistake_analyzer" }));
        expect(executeToolSpy).toHaveBeenNthCalledWith(4, expect.objectContaining({ toolName: "memory_store" }));

        executeToolSpy.mockRestore();
    });
});
