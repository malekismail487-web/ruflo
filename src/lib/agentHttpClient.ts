export interface ToolExecutionRequest {
    toolName: string;
    parameters: Record<string, unknown>;
    context?: Record<string, unknown>;
}

export interface ToolExecutionResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    executionTimeMs: number;
}

export interface AgentMessageRequest {
    message: string;
    context?: Record<string, unknown>;
    stream?: boolean;
    difficulty?: number;
}

export interface AgentMessageResponse {
    agentId: string;
    status: string;
    promptComplexity?: number;
    systemTheta?: number;
    output: string;
    context?: Record<string, unknown>;
}

export class AgentHttpClient {
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || this.resolveBaseUrl();
    }

    private resolveBaseUrl(): string {
        // Safe detection across Vite (import.meta.env), Node (process.env), or window
        try {
            if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ANTIGRAVITY_API_URL) {
                return import.meta.env.VITE_ANTIGRAVITY_API_URL;
            }
        } catch (_) {
            // Fallthrough if import.meta is unavailable
        }

        if (typeof process !== "undefined" && process.env && process.env.VITE_ANTIGRAVITY_API_URL) {
            return process.env.VITE_ANTIGRAVITY_API_URL;
        }

        return "http://localhost:3000";
    }

    /**
     * Dynamically resolves JWT session token from Supabase or localStorage/env
     */
    private getAuthHeader(): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };

        let token = "";

        // 1. Try resolving Supabase session token from localStorage or window if present
        if (typeof window !== "undefined" && window.localStorage) {
            try {
                const supabaseAuth = window.localStorage.getItem("sb-session") || window.localStorage.getItem("supabase.auth.token");
                if (supabaseAuth) {
                    const parsed = JSON.parse(supabaseAuth);
                    token = parsed?.access_token || parsed?.currentSession?.access_token || "";
                }
            } catch (_) {
                // Ignore parse errors
            }
        }

        // 2. Fallback to process.env API_SECRET / VITE_SUPABASE_ANON_KEY if no browser session token
        if (!token && typeof process !== "undefined" && process.env) {
            token = process.env.API_SECRET || process.env.VITE_SUPABASE_ANON_KEY || "";
        }

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Executes a tool remotely via POST /api/tools/execute.
     * Guaranteed to never throw; returns standardized error object on 500/502/network failure.
     */
    async executeTool<T = unknown>(request: ToolExecutionRequest): Promise<ToolExecutionResponse<T>> {
        const startTime = performance.now();

        if (!request.toolName) {
            return {
                success: false,
                error: "Invalid request: toolName is required.",
                executionTimeMs: performance.now() - startTime
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/tools/execute`, {
                method: "POST",
                headers: this.getAuthHeader(),
                body: JSON.stringify(request)
            });

            const endTime = performance.now();
            const executionTimeMs = Math.round(endTime - startTime);

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown server error");
                return {
                    success: false,
                    error: `API Gateway Error (${response.status}): ${errorText}`,
                    executionTimeMs
                };
            }

            const json = await response.json();
            return {
                success: json.success ?? true,
                data: json.data ?? json.result ?? json,
                error: json.error,
                executionTimeMs: json.executionTimeMs || executionTimeMs
            };
        } catch (err) {
            const endTime = performance.now();
            const errorMessage = err instanceof Error ? err.message : String(err);
            return {
                success: false,
                error: `Network/Gateway Failure: ${errorMessage}`,
                executionTimeMs: Math.round(endTime - startTime)
            };
        }
    }

    /**
     * Sends a cognitive prompt/message to an agent via POST /api/agents/:agentId/message.
     */
    async sendMessage(agentId: string, messageReq: AgentMessageRequest): Promise<AgentMessageResponse> {
        const response = await fetch(`${this.baseUrl}/api/agents/${encodeURIComponent(agentId)}/message`, {
            method: "POST",
            headers: this.getAuthHeader(),
            body: JSON.stringify(messageReq)
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => "Failed to reach agent");
            throw new Error(`Agent API Error (${response.status}): ${errText}`);
        }

        return await response.json();
    }
}

// Export singleton instance
export const agentClient = new AgentHttpClient();
