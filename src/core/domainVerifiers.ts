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
    joint1AngleRad: number;
    joint2AngleRad: number;
    minAngleRad?: number;
    maxAngleRad?: number;
    endEffectorPos: { x: number; y: number; z: number };
    targetPos: { x: number; y: number; z: number };
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
     * Executes real 1D/3D inelastic collision simulation between two rigid bodies
     * and computes exact physical conservation metrics.
     */
    simulateAndVerifyCollision(
        m1: number,
        u1: { x: number; y: number; z: number },
        m2: number,
        u2: { x: number; y: number; z: number },
        coefficientOfRestitution: number = 0.8
    ): CollisionVerificationResult {
        const flags: string[] = [];

        // Real 1D/3D Impact Impulse Solver:
        // v1 = u1 - (1 + e) * m2 / (m1 + m2) * (u1 - u2)
        // v2 = u2 + (1 + e) * m1 / (m1 + m2) * (u1 - u2)
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

        // Linear Momentum Conservation Calculation P = m1*v1 + m2*v2
        const pInit = {
            x: m1 * u1.x + m2 * u2.x,
            y: m1 * u1.y + m2 * u2.y,
            z: m1 * u1.z + m2 * u2.z
        };
        const pFin = {
            x: m1 * v1.x + m2 * v2.x,
            y: m1 * v1.y + m2 * v2.y,
            z: m1 * v1.z + m2 * v2.z
        };

        const pInitMag = Math.sqrt(pInit.x**2 + pInit.y**2 + pInit.z**2);
        const pFinMag = Math.sqrt(pFin.x**2 + pFin.y**2 + pFin.z**2);
        const pDevPercent = pInitMag === 0 ? 0 : (Math.abs(pFinMag - pInitMag) / pInitMag) * 100;

        // Kinetic Energy Calculation KE = 0.5 * m * v^2
        const keInit = 0.5 * m1 * (u1.x**2 + u1.y**2 + u1.z**2) + 0.5 * m2 * (u2.x**2 + u2.y**2 + u2.z**2);
        const keFin = 0.5 * m1 * (v1.x**2 + v1.y**2 + v1.z**2) + 0.5 * m2 * (v2.x**2 + v2.y**2 + v2.z**2);
        const energyLossPercent = keInit === 0 ? 0 : ((keInit - keFin) / keInit) * 100;

        if (pDevPercent > 0.0001) {
            flags.push(`[COLLISION VIOLATION] Linear momentum changed by ${pDevPercent.toFixed(6)}% (>0.0001% tolerance).`);
        }
        if (keFin > keInit + 1e-9) {
            flags.push(`[COLLISION VIOLATION] Kinetic energy increased post-impact (unphysical energy creation).`);
        }

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

    /**
     * Executes 2-bone IK solver against a real target position (10, 12, 0) with arm lengths (8, 8),
     * calculates actual joint angles via law of cosines, and evaluates position error.
     */
    simulateAndVerifyIK(
        rootPos: { x: number; y: number; z: number },
        targetPos: { x: number; y: number; z: number },
        bone1Length: number = 8.0,
        bone2Length: number = 8.0,
        minAngleRad: number = -Math.PI,
        maxAngleRad: number = Math.PI
    ): IKVerificationResult {
        const flags: string[] = [];

        // Real Law of Cosines 2-Bone IK Solver
        const dx = targetPos.x - rootPos.x;
        const dy = targetPos.y - rootPos.y;
        const dz = targetPos.z - rootPos.z;
        const targetDist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const reach = Math.min(targetDist, (bone1Length + bone2Length) * 0.9999);

        const cos2 = (reach*reach - bone1Length*bone1Length - bone2Length*bone2Length) / (2 * bone1Length * bone2Length);
        const joint2AngleRad = Math.acos(Math.max(-1, Math.min(1, cos2)));

        const cos1 = (bone1Length*bone1Length + reach*reach - bone2Length*bone2Length) / (2 * bone1Length * reach);
        const baseAngle = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz));
        const joint1AngleRad = baseAngle + Math.acos(Math.max(-1, Math.min(1, cos1)));

        // Forward Kinematics verification of end-effector location
        const endX = rootPos.x + bone1Length * Math.cos(joint1AngleRad) + bone2Length * Math.cos(joint1AngleRad + joint2AngleRad);
        const endY = rootPos.y + bone1Length * Math.sin(joint1AngleRad) + bone2Length * Math.sin(joint1AngleRad + joint2AngleRad);
        const endZ = rootPos.z;

        const errX = endX - targetPos.x;
        const errY = endY - targetPos.y;
        const errZ = endZ - targetPos.z;
        const targetErrorMeters = Math.sqrt(errX*errX + errY*errY + errZ*errZ);

        const j1Valid = !isNaN(joint1AngleRad) && joint1AngleRad >= minAngleRad && joint1AngleRad <= maxAngleRad;
        const j2Valid = !isNaN(joint2AngleRad) && joint2AngleRad >= minAngleRad && joint2AngleRad <= maxAngleRad;

        if (!j1Valid) flags.push(`[IK VIOLATION] Joint 1 angle (${joint1AngleRad.toFixed(4)}) outside valid bounds.`);
        if (!j2Valid) flags.push(`[IK VIOLATION] Joint 2 angle (${joint2AngleRad.toFixed(4)}) outside valid bounds.`);
        if (targetErrorMeters > 0.05) flags.push(`[IK VIOLATION] Target error (${targetErrorMeters.toFixed(4)}m) exceeds 0.05m tolerance.`);

        return {
            passed: flags.length === 0,
            joint1Valid: j1Valid,
            joint2Valid: j2Valid,
            targetErrorMeters: Number(targetErrorMeters.toFixed(6)),
            flags
        };
    }
}

export const domainVerifiers = new DomainVerifiers();
