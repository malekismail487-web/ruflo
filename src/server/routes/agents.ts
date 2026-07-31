import { Router, Request, Response } from "express";
import { PsychometricEngine } from "../../core/psychometricEngine.js";
import { NemotronClient } from "../../core/nemotronClient.js";

export const agentsRouter = Router();

export interface AgentInstance {
    id: string;
    type: string;
    status: "idle" | "busy" | "error";
    createdAt: string;
    thetaScore: number;
    metadata?: Record<string, unknown>;
}

const activeAgents = new Map<string, AgentInstance>();
const psychometricEngine = new PsychometricEngine();

/**
 * GET /api/agents
 * List all active agent instances
 */
agentsRouter.get("/", (_req: Request, res: Response) => {
    const agents = Array.from(activeAgents.values());
    res.status(200).json({
        count: agents.length,
        systemTheta: psychometricEngine.getTheta(),
        agents
    });
});

/**
 * POST /api/agents/spawn
 * Spawn a new specialized agent instance
 */
agentsRouter.post("/spawn", (req: Request, res: Response) => {
    const { type, metadata } = req.body;

    if (!type || typeof type !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'type' parameter in body." });
    }

    const id = `agent_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAgent: AgentInstance = {
        id,
        type,
        status: "idle",
        createdAt: new Date().toISOString(),
        thetaScore: psychometricEngine.getTheta(),
        metadata: metadata || {}
    };

    activeAgents.set(id, newAgent);

    res.status(201).json({
        message: "Agent spawned successfully",
        agent: newAgent
    });
});

/**
 * POST /api/agents/:agentId/message
 * Execute multi-turn interaction or task request with an agent.
 * Supports Server-Sent Events (SSE) streaming when stream: true is passed.
 */
agentsRouter.post("/:agentId/message", async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const { message, context, stream, difficulty } = req.body;

    if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'message' string in body." });
    }

    const agent = activeAgents.get(agentId);
    if (!agent) {
        return res.status(404).json({ error: `Agent with ID '${agentId}' not found.` });
    }

    agent.status = "busy";

    // Calculate prompt complexity theta score
    const promptComplexity = psychometricEngine.evaluatePromptComplexity(message);
    const taskDifficulty = typeof difficulty === "number" ? difficulty : 1.0;

    try {
        let aiOutput = "";

        // Use Nemotron 3 Ultra if NVIDIA_API_KEY is configured
        if (process.env.NVIDIA_API_KEY) {
            const client = new NemotronClient();
            aiOutput = await client.generate(message);
            psychometricEngine.updateTheta(taskDifficulty, 1); // Success evaluation
        } else {
            aiOutput = `[Offline Mode] Simulated response for agent ${agentId} on prompt: "${message}" (Complexity score: ${promptComplexity.toFixed(2)})`;
            psychometricEngine.updateTheta(taskDifficulty, 1);
        }

        agent.thetaScore = psychometricEngine.getTheta();

        if (stream) {
            // Server-Sent Events (SSE) Streaming Output
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            res.write(`data: ${JSON.stringify({ type: "start", agentId, theta: agent.thetaScore })}\n\n`);

            // Stream chunks
            const chunks = aiOutput.match(/.{1,30}/g) || [aiOutput];
            for (const chunk of chunks) {
                res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
                await new Promise(r => setTimeout(r, 50));
            }

            res.write(`data: ${JSON.stringify({ type: "done", agentId })}\n\n`);
            agent.status = "idle";
            return res.end();
        }

        // Standard JSON Execution Response
        agent.status = "idle";
        return res.status(200).json({
            agentId,
            status: "success",
            promptComplexity,
            systemTheta: agent.thetaScore,
            output: aiOutput,
            context: context || {}
        });

    } catch (err) {
        agent.status = "error";
        psychometricEngine.updateTheta(taskDifficulty, 0); // Failure score update
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        if (stream) {
            res.setHeader("Content-Type", "text/event-stream");
            res.write(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`);
            return res.end();
        }

        return res.status(500).json({
            error: "Failed to process agent message",
            details: errorMessage
        });
    }
});
