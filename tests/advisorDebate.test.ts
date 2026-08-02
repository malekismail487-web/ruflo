import { describe, it, expect } from "vitest";
import { advisorDebateEngine, AdvisorReview } from "../src/core/advisorDebate.js";
import { weightedConsensusEngine, AgentExpertiseProfile } from "../src/core/weightedConsensus.js";

describe("Milestone 1: Genuine Advisor Consensus & Weighted Voting", () => {
    it("should handle independent advisor reviews with disagreement and required revisions", () => {
        const reviews: AdvisorReview[] = [
            {
                advisorId: "adv_graphics",
                advisorRole: "Graphics_Lead_Advisor",
                decision: "APPROVE",
                confidence: 0.98,
                technicalJustification: "Vulkan shader pipeline layout is decoupled and memory efficient.",
                requiredChanges: [],
                specializationDomain: "graphics"
            },
            {
                advisorId: "adv_physics",
                advisorRole: "Physics_Lead_Advisor",
                decision: "REVISE",
                confidence: 0.92,
                technicalJustification: "N-body gravity step needs symplectic Velocity Verlet instead of Euler integration.",
                requiredChanges: ["Replace Euler integrator with Velocity Verlet"],
                specializationDomain: "physics"
            },
            {
                advisorId: "adv_arch",
                advisorRole: "General_Architect_Advisor",
                decision: "REVISE",
                confidence: 0.74,
                technicalJustification: "Requires clear abstract class boundaries between renderer and physics solver.",
                requiredChanges: ["Decouple physics solver from render loop"],
                specializationDomain: "architecture"
            }
        ];

        const record = advisorDebateEngine.conductDebate("prop_engine_core", "Vulkan & N-Body Physics Engine Core Plan", reviews);

        expect(record.consensusAchieved).toBe(true);
        expect(record.finalDecision).toBe("REVISE");
        expect(record.reviews.length).toBe(3);
        expect(record.reviews[1].requiredChanges).toContain("Replace Euler integrator with Velocity Verlet");
    });

    it("should compute confidence-weighted voting where domain expertise overrides raw vote count", () => {
        const graphicsExpert: AgentExpertiseProfile = {
            agentId: "graphics_expert",
            roleName: "Graphics_Specialist",
            confidence: 0.98,
            historicalAccuracy: 0.95,
            specializationScore: 0.99,
            recentCorrectionRate: 0.02
        };

        const novice1: AgentExpertiseProfile = {
            agentId: "novice_1",
            roleName: "General_Coder_1",
            confidence: 0.50,
            historicalAccuracy: 0.60,
            specializationScore: 0.40,
            recentCorrectionRate: 0.25
        };

        const novice2: AgentExpertiseProfile = {
            agentId: "novice_2",
            roleName: "General_Coder_2",
            confidence: 0.50,
            historicalAccuracy: 0.55,
            specializationScore: 0.35,
            recentCorrectionRate: 0.30
        };

        const votes = [
            { profile: graphicsExpert, voteOption: "Option_Vulkan_PBR" },
            { profile: novice1, voteOption: "Option_Basic_OpenGL" },
            { profile: novice2, voteOption: "Option_Basic_OpenGL" }
        ];

        const result = weightedConsensusEngine.evaluateWeightedVote("shader_pipeline_choice", votes);

        // Even though 2 novices voted for OpenGL, the Graphics Expert's weighted vote (0.98*0.95*0.99*0.98 = 0.9038)
        // outweighs the sum of 2 novices (~0.09 + ~0.06 = 0.15)!
        expect(result.winningOption).toBe("Option_Vulkan_PBR");
        expect(result.weightedSupportPercentage).toBeGreaterThan(80.0);
    });
});
