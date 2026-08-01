# Standalone Platform Architecture & Implementation Verification

This document provides a grounded, line-traceable overview of the core components in the repository.

---

## 1. System Components & Traceability

### A. Standalone API Server Gateway
- **Implementation**: [src/server/index.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/server/index.ts#L1-L74)
- **Behavior**: Express HTTP server running on `API_PORT` (default 3000). Mounts public health endpoint (`/health`, L22-L30), Bearer token authentication middleware ([src/server/middleware/auth.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/server/middleware/auth.ts#L1-L40)), agent interaction routes ([src/server/routes/agents.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/server/routes/agents.ts#L1-L148)), and tool execution routes ([src/server/routes/tools.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/server/routes/tools.ts#L1-L203)).
- **Verification**: Tested in [tests/server.test.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/tests/server.test.ts#L1-L30).

### B. NVIDIA Model Integration Client
- **Implementation**: [src/core/nemotronClient.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/core/nemotronClient.ts#L1-L41)
- **Behavior**: Instantiates HTTP POST requests to `https://integrate.api.nvidia.com/v1/chat/completions` using authorization header `Bearer process.env.NVIDIA_API_KEY`. Default model parameter is configured to `meta/llama-3.1-70b-instruct` ([src/core/nemotronClient.ts#L6](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/core/nemotronClient.ts#L6)).
- **Verification**: Verified via live HTTP POST request execution returning `HTTP 200 OK` (`id: chatcmpl-b626dec805d07eef`, model `meta/llama-3.1-70b-instruct`).

### C. Psychometric Adaptive Engine ($\text{IRT} + \theta$)
- **Implementation**: [src/core/psychometricEngine.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/core/psychometricEngine.ts#L1-L38)
- **Behavior**: Implements Rasch Item Response Theory (IRT) probability calculation:
  $$P(\text{success}) = \frac{1}{1 + \exp(-(\theta - b))}$$
  Updates baseline $\theta$ via: $\theta_{\text{new}} = \theta + \text{learningRate} \times (\text{success} - P(\text{success}))$.
- **Verification**: Tested in [tests/psychometricEngine.test.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/tests/psychometricEngine.test.ts#L1-L35). Evaluates exact Rasch math ($\theta = 0, b = 0, \text{success} = 1 \implies \theta = 0.25$).

### D. Scientific Physics Simulation Engine
- **Implementation**: [src/core/physicsSimEngine.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/core/physicsSimEngine.ts#L1-L214)
- **Behavior**: Standalone TypeScript simulation module. Computes N-body gravitational acceleration ($F = G \frac{m_1 m_2}{r^2}$), 3D neural connectome layout generation, two-bone Inverse Kinematics (IK) joint angles, and 3D raycast sphere intersections.
- **Scope Note**: Pure TypeScript algorithm implementations. Native C++ O3DE engine process bindings are out of scope.
- **Verification**: Tested in [tests/physicsSimEngine.test.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/tests/physicsSimEngine.test.ts#L1-L45).

### E. Decoupled Agent HTTP Client Gateway
- **Implementation**: [src/lib/agentHttpClient.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/lib/agentHttpClient.ts#L1-L162)
- **Behavior**: Handles outbound POST requests to `/api/tools/execute`. Includes execution time tracking (`performance.now()`), dynamic Supabase JWT header injection, and `try/catch` error boundaries returning structured error payloads on network/500 failures.
- **Verification**: Tested in [tests/agentHttpClient.test.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/tests/agentHttpClient.test.ts#L1-L60).

### F. Core Agent Orchestrator
- **Implementation**: [src/agents/orchestrator.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/src/agents/orchestrator.ts#L1-L105)
- **Behavior**: Executes multi-step cognitive loops via `agentClient.executeTool`. Captures tool output data payloads and logs execution steps.
- **Verification**: Tested in [tests/orchestrator.test.ts](file:///C:/Users/loka3/.gemini/antigravity/scratch/ruflo/tests/orchestrator.test.ts#L1-L50).
