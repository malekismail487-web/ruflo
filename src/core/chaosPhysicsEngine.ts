/**
 * Chaos Rigid-Body Physics Engine & Numerical Verification Module
 * Solves rigid-body 3D dynamics, impulse response vectors J, restitution coefficients e,
 * and performs explicit numerical verification of linear momentum conservation (P_init == P_final)
 * and kinetic energy dissipation balance.
 */

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface RigidBodyState {
    id: string;
    name: string;
    massKg: number;
    positionMeters: Vector3;
    velocityMps: Vector3;
    radiusMeters?: number;
}

export interface ChaosCollisionVerificationResult {
    collisionId: string;
    timestamp: string;
    body1Id: string;
    body2Id: string;
    coefficientOfRestitution: number;
    initialLinearMomentumKgMps: Vector3;
    finalLinearMomentumKgMps: Vector3;
    momentumDeviationPercent: number;
    impulseMagnitudeNs: number;
    initialKineticEnergyJoules: number;
    finalKineticEnergyJoules: number;
    energyDissipatedJoules: number;
    momentumConserved: boolean;
    energyBalancePhysical: boolean;
    passed: boolean;
    verificationLog: string[];
}

export class ChaosPhysicsEngine {
    private vecMag(v: Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    /**
     * Solves 3D central impact collision between two Chaos rigid bodies
     */
    simulateCollision(
        body1: RigidBodyState,
        body2: RigidBodyState,
        restitution: number = 0.85
    ): ChaosCollisionVerificationResult {
        const collisionId = `col-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const timestamp = new Date().toISOString();
        const log: string[] = [];

        const e = Math.max(0, Math.min(1.0, restitution));
        const m1 = body1.massKg;
        const m2 = body2.massKg;
        const u1 = body1.velocityMps;
        const u2 = body2.velocityMps;

        log.push(`[ChaosPhysics] Simulating 3D collision: Body 1 ('${body1.name}', m=${m1}kg) vs Body 2 ('${body2.name}', m=${m2}kg), e=${e}`);

        // Initial momentum P_init = m1*u1 + m2*u2
        const pInit: Vector3 = {
            x: m1 * u1.x + m2 * u2.x,
            y: m1 * u1.y + m2 * u2.y,
            z: m1 * u1.z + m2 * u2.z
        };
        const pInitMag = this.vecMag(pInit);

        // Initial Kinetic Energy E_init = 0.5*m1*u1^2 + 0.5*m2*u2^2
        const keInit = 0.5 * m1 * (u1.x * u1.x + u1.y * u1.y + u1.z * u1.z) +
                       0.5 * m2 * (u2.x * u2.x + u2.y * u2.y + u2.z * u2.z);

        // 1D/3D central impulse factors
        const factor1 = ((1 + e) * m2) / (m1 + m2);
        const factor2 = ((1 + e) * m1) / (m1 + m2);

        // Final velocities v1 and v2
        const v1: Vector3 = {
            x: u1.x - factor1 * (u1.x - u2.x),
            y: u1.y - factor1 * (u1.y - u2.y),
            z: u1.z - factor1 * (u1.z - u2.z)
        };

        const v2: Vector3 = {
            x: u2.x + factor2 * (u1.x - u2.x),
            y: u2.y + factor2 * (u1.y - u2.y),
            z: u2.z + factor2 * (u1.z - u2.z)
        };

        // Final momentum P_final = m1*v1 + m2*v2
        const pFinal: Vector3 = {
            x: m1 * v1.x + m2 * v2.x,
            y: m1 * v1.y + m2 * v2.y,
            z: m1 * v1.z + m2 * v2.z
        };
        const pFinalMag = this.vecMag(pFinal);

        // Momentum deviation
        const momentumDevPercent = pInitMag === 0 ? 0 : (Math.abs(pFinalMag - pInitMag) / pInitMag) * 100;
        const momentumConserved = momentumDevPercent < 0.0001;

        // Impulse J = m1 * (v1 - u1)
        const impulseVector: Vector3 = {
            x: m1 * (v1.x - u1.x),
            y: m1 * (v1.y - u1.y),
            z: m1 * (v1.z - u1.z)
        };
        const impulseMag = this.vecMag(impulseVector);

        // Final Kinetic Energy
        const keFinal = 0.5 * m1 * (v1.x * v1.x + v1.y * v1.y + v1.z * v1.z) +
                        0.5 * m2 * (v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
        const energyDissipated = keInit - keFinal;
        const energyBalancePhysical = keFinal <= keInit + 1e-9;

        log.push(`[ChaosPhysics] Initial Momentum Mag: ${pInitMag.toFixed(6)} kg*m/s`);
        log.push(`[ChaosPhysics] Final Momentum Mag:   ${pFinalMag.toFixed(6)} kg*m/s`);
        log.push(`[ChaosPhysics] Momentum Deviation:    ${momentumDevPercent.toFixed(8)}% (Conserved=${momentumConserved})`);
        log.push(`[ChaosPhysics] Collision Impulse:     ${impulseMag.toFixed(4)} N*s`);
        log.push(`[ChaosPhysics] Initial KE: ${keInit.toFixed(4)} J -> Final KE: ${keFinal.toFixed(4)} J (Dissipated=${energyDissipated.toFixed(4)} J)`);

        const passed = momentumConserved && energyBalancePhysical;

        return {
            collisionId,
            timestamp,
            body1Id: body1.id,
            body2Id: body2.id,
            coefficientOfRestitution: e,
            initialLinearMomentumKgMps: pInit,
            finalLinearMomentumKgMps: pFinal,
            momentumDeviationPercent: Number(momentumDevPercent.toFixed(8)),
            impulseMagnitudeNs: Number(impulseMag.toFixed(4)),
            initialKineticEnergyJoules: Number(keInit.toFixed(4)),
            finalKineticEnergyJoules: Number(keFinal.toFixed(4)),
            energyDissipatedJoules: Number(energyDissipated.toFixed(4)),
            momentumConserved,
            energyBalancePhysical,
            passed,
            verificationLog: log
        };
    }
}

export const chaosPhysicsEngine = new ChaosPhysicsEngine();
