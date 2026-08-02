export interface CollisionVerificationInput {
    m1: number;
    u1: { x: number; y: number; z: number };
    v1: { x: number; y: number; z: number };
    m2: number;
    u2: { x: number; y: number; z: number };
    v2: { x: number; y: number; z: number };
}

export interface CollisionVerificationResult {
    passed: boolean;
    initialMomentumMag: number;
    finalMomentumMag: number;
    momentumDeviationPercent: number;
    initialKineticEnergyJoules: number;
    finalKineticEnergyJoules: number;
    energyLossPercent: number;
    flags: string[];
}

export interface IKVerificationInput {
    rootPos: { x: number; y: number; z: number };
    targetPos: { x: number; y: number; z: number };
    bone1Length: number;
    bone2Length: number;
    minAngleRad?: number;
    maxAngleRad?: number;
}

export interface IKVerificationResult {
    passed: boolean;
    targetDistanceMeters: number;
    baseAngleRad: number;
    shoulderTriangleAngleRad: number;
    joint1ShoulderAngleRad: number;
    interiorElbowAngleRad: number;
    relativeDeflectionAngleRad: number;
    absoluteBone2AngleRad: number;
    forwardKinematicPos: { x: number; y: number; z: number };
    targetErrorMeters: number;
    flags: string[];
}

export class DomainVerifiers {
    simulateAndVerifyCollision(
        m1: number,
        u1: { x: number; y: number; z: number },
        m2: number,
        u2: { x: number; y: number; z: number },
        coefficientOfRestitution: number = 0.8
    ): CollisionVerificationResult {
        const flags: string[] = [];

        const e = Math.max(0, Math.min(1, coefficientOfRestitution));
        const factor1 = ((1 + e) * m2) / (m1 + m2);
        const factor2 = ((1 + e) * m1) / (m1 + m2);

        const v1 = {
            x: u1.x - factor1 * (u1.x - u2.x),
            y: u1.y - factor1 * (u1.y - u2.y),
            z: u1.z - factor1 * (u1.z - u2.z)
        };

        const v2 = {
            x: u2.x + factor2 * (u1.x - u2.x),
            y: u2.y + factor2 * (u1.y - u2.y),
            z: u2.z + factor2 * (u1.z - u2.z)
        };

        const pInit = { x: m1 * u1.x + m2 * u2.x, y: m1 * u1.y + m2 * u2.y, z: m1 * u1.z + m2 * u2.z };
        const pFin = { x: m1 * v1.x + m2 * v2.x, y: m1 * v1.y + m2 * v2.y, z: m1 * v1.z + m2 * v2.z };

        const pInitMag = Math.sqrt(pInit.x**2 + pInit.y**2 + pInit.z**2);
        const pFinMag = Math.sqrt(pFin.x**2 + pFin.y**2 + pFin.z**2);
        const pDevPercent = pInitMag === 0 ? 0 : (Math.abs(pFinMag - pInitMag) / pInitMag) * 100;

        const keInit = 0.5 * m1 * (u1.x**2 + u1.y**2 + u1.z**2) + 0.5 * m2 * (u2.x**2 + u2.y**2 + u2.z**2);
        const keFin = 0.5 * m1 * (v1.x**2 + v1.y**2 + v1.z**2) + 0.5 * m2 * (v2.x**2 + v2.y**2 + v2.z**2);
        const energyLossPercent = keInit === 0 ? 0 : ((keInit - keFin) / keInit) * 100;

        if (pDevPercent > 0.0001) flags.push(`[COLLISION VIOLATION] Linear momentum changed by ${pDevPercent.toFixed(6)}%.`);
        if (keFin > keInit + 1e-9) flags.push(`[COLLISION VIOLATION] Unphysical energy creation detected.`);

        return {
            passed: flags.length === 0,
            initialMomentumMag: Number(pInitMag.toFixed(4)),
            finalMomentumMag: Number(pFinMag.toFixed(4)),
            momentumDeviationPercent: Number(pDevPercent.toFixed(6)),
            initialKineticEnergyJoules: Number(keInit.toFixed(4)),
            finalKineticEnergyJoules: Number(keFin.toFixed(4)),
            energyLossPercent: Number(energyLossPercent.toFixed(4)),
            flags
        };
    }

    simulateAndVerifyIK(input: IKVerificationInput): IKVerificationResult {
        const flags: string[] = [];
        const { rootPos, targetPos, bone1Length: L1, bone2Length: L2 } = input;

        const dx = targetPos.x - rootPos.x;
        const dy = targetPos.y - rootPos.y;
        const dz = targetPos.z - rootPos.z;
        const D = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const reach = Math.min(D, (L1 + L2) * 0.9999);

        // 1. Base Angle psi
        const psi = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

        // 2. Interior Shoulder Angle alpha1
        const cos_alpha1 = (L1 * L1 + reach * reach - L2 * L2) / (2 * L1 * reach);
        const alpha1 = Math.acos(Math.max(-1, Math.min(1, cos_alpha1)));

        // 3. Shoulder Joint Angle theta1 (Elbow-Up)
        const theta1 = psi + alpha1;

        // 4. Interior Elbow Angle phi2
        const cos_phi2 = (L1 * L1 + L2 * L2 - reach * reach) / (2 * L1 * L2);
        const phi2 = Math.acos(Math.max(-1, Math.min(1, cos_phi2)));

        // 5. Relative Deflection Angle alpha2 (Deviation from straight extension of Bone 1)
        const alpha2 = Math.PI - phi2;

        // 6. Absolute Bone 2 Angle theta2_abs
        const theta2_abs = theta1 - alpha2;

        // 7. Forward Kinematics (FK) Position
        const fkX = rootPos.x + L1 * Math.cos(theta1) + L2 * Math.cos(theta2_abs);
        const fkY = rootPos.y + L1 * Math.sin(theta1) + L2 * Math.sin(theta2_abs);
        const fkZ = rootPos.z;

        const errX = fkX - targetPos.x;
        const errY = fkY - targetPos.y;
        const errZ = fkZ - targetPos.z;
        const targetErrorMeters = Math.sqrt(errX * errX + errY * errY + errZ * errZ);

        const minAngle = input.minAngleRad ?? -Math.PI;
        const maxAngle = input.maxAngleRad ?? Math.PI;
        const j1Valid = !isNaN(theta1) && theta1 >= minAngle && theta1 <= maxAngle;
        const j2Valid = !isNaN(alpha2) && alpha2 >= minAngle && alpha2 <= maxAngle;

        if (!j1Valid) flags.push(`[IK VIOLATION] Joint 1 angle (${theta1.toFixed(4)}) out of bounds.`);
        if (!j2Valid) flags.push(`[IK VIOLATION] Joint 2 angle (${alpha2.toFixed(4)}) out of bounds.`);
        if (targetErrorMeters > 0.01) flags.push(`[IK VIOLATION] Target error (${targetErrorMeters.toFixed(6)}m) > 0.01m tolerance.`);

        return {
            passed: flags.length === 0,
            targetDistanceMeters: Number(D.toFixed(8)),
            baseAngleRad: Number(psi.toFixed(8)),
            shoulderTriangleAngleRad: Number(alpha1.toFixed(8)),
            joint1ShoulderAngleRad: Number(theta1.toFixed(8)),
            interiorElbowAngleRad: Number(phi2.toFixed(8)),
            relativeDeflectionAngleRad: Number(alpha2.toFixed(8)),
            absoluteBone2AngleRad: Number(theta2_abs.toFixed(8)),
            forwardKinematicPos: { x: Number(fkX.toFixed(8)), y: Number(fkY.toFixed(8)), z: Number(fkZ.toFixed(8)) },
            targetErrorMeters: Number(targetErrorMeters.toExponential(6)),
            flags
        };
    }

    verifyUnrealEngineResult(executionResult: any) {
        const { unrealDomainVerifier } = require("./unrealDomainVerifier.js");
        return unrealDomainVerifier.verifyUnrealExecution(executionResult);
    }
}

export const domainVerifiers = new DomainVerifiers();

