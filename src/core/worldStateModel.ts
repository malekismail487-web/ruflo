import { unifiedEventBus } from "./unifiedEventBus.js";

export interface SystemSubstate {
    status: "HEALTHY" | "DEGRADED" | "CRITICAL";
    activeComponentsCount: number;
    lastVerifiedTimestamp: string;
    details: Record<string, unknown>;
}

export interface AuthoritativeWorldState {
    projectName: string;
    lastUpdated: string;
    architectureState: SystemSubstate;
    buildState: SystemSubstate;
    dependencyState: SystemSubstate;
    performanceMetrics: SystemSubstate;
    securityMetrics: SystemSubstate;
    testingStatus: SystemSubstate;
    documentationStatus: SystemSubstate;
    physicsSystems: SystemSubstate;
    renderingSystems: SystemSubstate;
    networkingSystems: SystemSubstate;
}

export class WorldStateModel {
    private state: AuthoritativeWorldState;

    constructor(projectName: string = "AAA_NextGen_Engine") {
        const now = new Date().toISOString();
        const defaultSubstate = (name: string): SystemSubstate => ({
            status: "HEALTHY",
            activeComponentsCount: 1,
            lastVerifiedTimestamp: now,
            details: { name, initialized: true }
        });

        this.state = {
            projectName,
            lastUpdated: now,
            architectureState: defaultSubstate("Architecture"),
            buildState: defaultSubstate("Build"),
            dependencyState: defaultSubstate("Dependencies"),
            performanceMetrics: defaultSubstate("Performance"),
            securityMetrics: defaultSubstate("Security"),
            testingStatus: defaultSubstate("Testing"),
            documentationStatus: defaultSubstate("Documentation"),
            physicsSystems: defaultSubstate("Physics"),
            renderingSystems: defaultSubstate("Rendering"),
            networkingSystems: defaultSubstate("Networking")
        };
    }

    getWorldState(): AuthoritativeWorldState {
        return JSON.parse(JSON.stringify(this.state));
    }

    updateSubstate(subsystem: keyof Omit<AuthoritativeWorldState, "projectName" | "lastUpdated">, update: Partial<SystemSubstate>) {
        const now = new Date().toISOString();
        this.state.lastUpdated = now;
        this.state[subsystem] = {
            ...this.state[subsystem],
            ...update,
            lastVerifiedTimestamp: now
        };

        unifiedEventBus.emitLog(
            "world_state_model",
            "World_State_Model",
            "ALIGNMENT",
            `Authoritative World State updated for '${String(subsystem)}': Status=${this.state[subsystem].status} | Components=${this.state[subsystem].activeComponentsCount}`,
            { targetComponent: String(subsystem) }
        );
    }
}

export const worldStateModel = new WorldStateModel();
