import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentHttpClient } from "../src/lib/agentHttpClient.js";

describe("AgentHttpClient", () => {
    let client: AgentHttpClient;

    beforeEach(() => {
        client = new AgentHttpClient("http://localhost:3000");
    });

    it("should format ToolExecutionRequest correctly and return data on success", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                data: { result: "evaluated_score" },
                executionTimeMs: 45
            })
        });

        global.fetch = mockFetch;

        const response = await client.executeTool({
            toolName: "psychometric_eval",
            parameters: { prompt: "test prompt", difficulty: 1.0 }
        });

        expect(response.success).toBe(true);
        expect(response.data).toEqual({ result: "evaluated_score" });
        expect(mockFetch).toHaveBeenCalledWith(
            "http://localhost:3000/api/tools/execute",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    toolName: "psychometric_eval",
                    parameters: { prompt: "test prompt", difficulty: 1.0 }
                })
            })
        );
    });

    it("should gracefully handle 500/502 server errors without throwing uncaught exception", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 502,
            text: async () => "Bad Gateway"
        });

        global.fetch = mockFetch;

        const response = await client.executeTool({
            toolName: "psychometric_eval",
            parameters: {}
        });

        expect(response.success).toBe(false);
        expect(response.error).toContain("API Gateway Error (502)");
        expect(response.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should gracefully handle network failure without throwing", async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

        const response = await client.executeTool({
            toolName: "mistake_analyzer",
            parameters: {}
        });

        expect(response.success).toBe(false);
        expect(response.error).toContain("Network connection refused");
    });
});
