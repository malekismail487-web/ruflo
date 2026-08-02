import { describe, it, expect } from "vitest";
import { agentFactory } from "../src/core/agentFactory.js";
import { unifiedEventBus } from "../src/core/unifiedEventBus.js";
import { mandatoryTriadManager } from "../src/core/mandatoryTriad.js";
import { errorRebuilderEngine } from "../src/core/errorRebuilder.js";
import { SwarmOrchestrator } from "../src/core/swarmOrchestrator.js";

describe("Autonomous Dynamic Self-Splitting Swarm Platform Tests", () => {
    it("should dynamically create abstract agents with injected API credentials and tracking feature", () => {
        const agent = agentFactory.createAgent("Custom_Architect", "Design multi-tier architecture.");
        expect(agent.id).toBeDefined();
        expect(agent.roleName).toBe("Custom_Architect");
        expect(agent.apiKey).toBeDefined();
        expect(agent.enableTracking).toBe(true);
    });

    it("should initialize mandatory Triad (Advisor, Verifier, Researcher)", () => {
        const triad = mandatoryTriadManager.getTriadAgents();
        expect(triad.advisor.roleName).toBe("Mandatory_Advisor_Agent");
        expect(triad.verifier.roleName).toBe("Mandatory_Verifier_Agent");
        expect(triad.researcher.roleName).toBe("Mandatory_Researcher_Agent");
    });

    it("should enforce Advisor Consensus Gate and calculate Verifier Trajectory Drift", () => {
        const consensus = mandatoryTriadManager.requestAdvisorConsensus("Modular decoupled microservice architecture plan");
        expect(consensus.approved).toBe(true);

        const drift = mandatoryTriadManager.calculateTrajectoryDrift(10, 10);
        expect(drift.driftPercent).toBe(0);
        expect(drift.aligned).toBe(true);
    });

    it("should execute Splitting Phase, Agent Replication, and Swarm Scenario Build", async () => {
        const orchestrator = new SwarmOrchestrator();
        const splitResult = orchestrator.initiateSplittingPhase("AAA_Renderer_Subsystem", ["Graphics_Lead", "Memory_Lead"]);

        expect(splitResult.parents.length).toBe(2);

        // Replicate a worker node from Graphics_Lead parent
        const parentId = splitResult.parents[0].id;
        const worker = orchestrator.replicateWorkerAgent(parentId, "Vulkan_Pipeline", "Optimize Vulkan command buffer submission");
        expect(worker.parentAgentId).toBe(parentId);

        const summary = await orchestrator.executeSwarmBuildScenario(
            "AAA_Renderer_Subsystem",
            "Valid modular Vulkan rendering architecture plan",
            12,
            12
        );

        expect(summary.advisorConsensusApproved).toBe(true);
        expect(summary.totalAgentsCreated).toBeGreaterThanOrEqual(6);
        expect(summary.trajectoryDriftPercent).toBe(0);
    });

    it("should trigger targeted Error Rebuilder agent on log error detection", () => {
        const res = errorRebuilderEngine.spawnAndExecuteRebuild("vulkan_shader_cache.cpp", "SyntaxError: missing semicolon at L42", "Add missing semicolon");
        expect(res.rebuiltSuccessfully).toBe(true);
        expect(res.excisedLinesCount).toBeGreaterThan(0);
    });
});
