/**
 * Domain-Specific Pre-Shipment Correctness Verifiers
 * Defines what "wrong" looks like for each domain and checks it automatically.
 */

export interface CollisionVerificationInput {
    m1: number;
    u1: { x: number; y: number; z: number };
    v1: { x: number; y: number; z: number };
    m2: number;
    u2: { x: number; y: number; z: number };
    v2: { x: number; y: number; z: number };
    coefficientOfRestitution?: number;
}

export interface CollisionVerificationResult {
    passed: boolean;
    initialMomentumMag: number;
    finalMomentumMag: number;
    momentumDeviationPercent: number;
    initialKineticEnergy: number;
    finalKineticEnergy: number;
    energyLossPercent: number;
    flags: string[];
}

export interface IKVerificationInput {
    joint1AngleRad: number;
    joint2AngleRad: number;
    minAngleRad?: number;
    maxAngleRad?: number;
    endEffectorPos: { x: number; y: number; z: number };
    targetPos: { x: number; y: number; z: number };
    toleranceMeters?: number;
}

export interface IKVerificationResult {
    passed: boolean;
    joint1Valid: boolean;
    joint2Valid: boolean;
    targetErrorMeters: number;
    flags: string[];
}

export class DomainVerifiers {
    /**
     * Verifies momentum and energy conservation in rigid-body collisions.
     */
    verifyCollisionPhysics(input: CollisionVerificationInput): CollisionVerificationResult {
        const flags: string[] = [];

        // Linear Momentum P = m1*v1 + m2*v2
        const pInitial = {
            x: input.m1 * input.u1.x + input.m2 * input.u2.x,
            y: input.m1 * input.u1.y + input.m2 * input.u2.y,
            z: input.m1 * input.u1.z + input.m2 * input.u2.z
        };

        const pFinal = {
            x: input.m1 * input.v1.x + input.m2 * input.v2.x,
            y: input.m1 * input.v1.y + input.m2 * input.v2.y,
            z: input.m1 * input.v1.z + input.m2 * input.v2.z
        };

        const pInitMag = Math.sqrt(pInitial.x ** 2 + pInitial.y ** 2 + pInitial.z ** 2);
        const pFinMag = Math.sqrt(pFinal.x ** 2 + pFinal.y ** 2 + pFinal.z ** 2);
        const pDevPercent = pInitMag === 0 ? 0 : (Math.abs(pFinMag - pInitMag) / pInitMag) * 100;

        // Kinetic Energy KE = 0.5 * m1 * v1^2 + 0.5 * m2 * v2^2
        const keInit = 0.5 * input.m1 * (input.u1.x**2 + input.u1.y**2 + input.u1.z**2) +
                       0.5 * input.m2 * (input.u2.x**2 + input.u2.y**2 + input.u2.z**2);
        const keFin = 0.5 * input.m1 * (input.v1.x**2 + input.v1.y**2 + input.v1.z**2) +
                      0.5 * input.m2 * (input.v2.x**2 + input.v2.y**2 + input.v2.z**2);

        const energyLossPercent = keInit === 0 ? 0 : ((keInit - keFin) / keInit) * 100;

        if (pDevPercent > 1.0) {
            flags.push(`[COLLISION VIOLATION] Linear momentum changed by ${pDevPercent.toFixed(4)}% (>1.0% tolerance).`);
        }
        if (keFin > keInit + 1e-6) {
            flags.push(`[COLLISION VIOLATION] Kinetic energy increased after impact (unphysical energy creation).`);
        }

        return {
            passed: flags.length === 0,
            initialMomentumMag: pInitMag,
            finalMomentumMag: pFinMag,
            momentumDeviationPercent: Number(pDevPercent.toFixed(4)),
            initialKineticEnergy: keInit,
            finalKineticEnergy: keFin,
            energyLossPercent: Number(energyLossPercent.toFixed(4)),
            flags
        };
    }

    /**
     * Verifies Inverse Kinematics joint limits and reachability.
     */
    verifyIKRigging(input: IKVerificationInput): IKVerificationResult {
        const flags: string[] = [];
        const minAngle = input.minAngleRad ?? -Math.PI;
        const maxAngle = input.maxAngleRad ?? Math.PI;

        const j1Valid = !isNaN(input.joint1AngleRad) && input.joint1AngleRad >= minAngle && input.joint1AngleRad <= maxAngle;
        const j2Valid = !isNaN(input.joint2AngleRad) && input.joint2AngleRad >= minAngle && input.joint2AngleRad <= maxAngle;

        const dx = input.endEffectorPos.x - input.targetPos.x;
        const dy = input.endEffectorPos.y - input.targetPos.y;
        const dz = input.endEffectorPos.z - input.targetPos.z;
        const errorDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const tol = input.toleranceMeters ?? 0.01;

        if (!j1Valid) flags.push(`[IK VIOLATION] Joint 1 angle (${input.joint1AngleRad.toFixed(4)} rad) outside valid limits [${minAngle.toFixed(2)}, ${maxAngle.toFixed(2)}].`);
        if (!j2Valid) flags.push(`[IK VIOLATION] Joint 2 angle (${input.joint2AngleRad.toFixed(4)} rad) outside valid limits [${minAngle.toFixed(2)}, ${maxAngle.toFixed(2)}].`);
        if (errorDist > tol) flags.push(`[IK VIOLATION] End effector target distance error (${errorDist.toFixed(4)} m) exceeds tolerance (${tol} m).`);

        return {
            passed: flags.length === 0,
            joint1Valid: j1Valid,
            joint2Valid: j2Valid,
            targetErrorMeters: Number(errorDist.toFixed(4)),
            flags
        };
    }
}

export const domainVerifiers = new DomainVerifiers();
