export interface OrbitalStateSample {
    frame: number;
    timeSeconds: number;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
}

export interface PhysicsSelfCheckResult {
    domain: string;
    passed: boolean;
    initialEnergyJoules: number;
    finalEnergyJoules: number;
    energyDeviationPercent: number;
    initialAngularMomentum: number;
    finalAngularMomentum: number;
    angularMomentumDeviationPercent: number;
    minRadiusMeters: number;
    maxRadiusMeters: number;
    peakToTroughRadiusFluctuationPercent: number;
    endToEndRadiusDriftPercent: number;
    flags: string[];
}

export class PhysicsSelfChecker {
    private G: number = 6.67430e-11;

    checkOrbitalPhysics(
        m1: number,
        m2: number,
        samples: OrbitalStateSample[],
        energyTolerancePercent: number = 1.0
    ): PhysicsSelfCheckResult {
        if (samples.length < 2) {
            throw new Error("Self-check requires at least 2 state samples.");
        }

        const flags: string[] = [];

        const computeMetrics = (s: OrbitalStateSample) => {
            const rx = s.position.x;
            const ry = s.position.y;
            const rz = s.position.z;
            const r = Math.sqrt(rx * rx + ry * ry + rz * rz);

            const vx = s.velocity.x;
            const vy = s.velocity.y;
            const vz = s.velocity.z;
            const vSq = vx * vx + vy * vy + vz * vz;

            const eKin = 0.5 * m2 * vSq;
            const ePot = -(this.G * m1 * m2) / r;
            const totalEnergy = eKin + ePot;

            const lx = m2 * (ry * vz - rz * vy);
            const ly = m2 * (rz * vx - rx * vz);
            const lz = m2 * (rx * vy - ry * vx);
            const angularMomentumMag = Math.sqrt(lx * lx + ly * ly + lz * lz);

            return { r, totalEnergy, angularMomentumMag };
        };

        const initial = computeMetrics(samples[0]);
        const final = computeMetrics(samples[samples.length - 1]);

        let minR = Infinity;
        let maxR = -Infinity;

        samples.forEach(s => {
            const r = Math.sqrt(s.position.x ** 2 + s.position.y ** 2 + s.position.z ** 2);
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
        });

        const energyDev = Math.abs((final.totalEnergy - initial.totalEnergy) / initial.totalEnergy) * 100;
        const angDev = Math.abs((final.angularMomentumMag - initial.angularMomentumMag) / initial.angularMomentumMag) * 100;
        
        // Exact Peak-to-Trough Fluctuation across all trajectory frames
        const peakToTroughFluctuation = Math.abs(maxR - minR) / initial.r * 100;
        // End-to-End Drift between initial frame and return frame
        const endToEndDrift = Math.abs(final.r - initial.r) / initial.r * 100;

        if (energyDev > energyTolerancePercent) {
            flags.push(`[VIOLATION] Total Energy Drift (${energyDev.toFixed(4)}%) exceeds ${energyTolerancePercent}% tolerance.`);
        }
        if (angDev > 1.0) {
            flags.push(`[VIOLATION] Angular Momentum Drift (${angDev.toFixed(4)}%) exceeds 1.0% tolerance.`);
        }

        return {
            domain: "2-Body Orbital Gravity",
            passed: flags.length === 0,
            initialEnergyJoules: initial.totalEnergy,
            finalEnergyJoules: final.totalEnergy,
            energyDeviationPercent: Number(energyDev.toFixed(4)),
            initialAngularMomentum: initial.angularMomentumMag,
            finalAngularMomentum: final.angularMomentumMag,
            angularMomentumDeviationPercent: Number(angDev.toFixed(4)),
            minRadiusMeters: minR,
            maxRadiusMeters: maxR,
            peakToTroughRadiusFluctuationPercent: Number(peakToTroughFluctuation.toFixed(4)),
            endToEndRadiusDriftPercent: Number(endToEndDrift.toFixed(4)),
            flags
        };
    }
}

export const physicsSelfChecker = new PhysicsSelfChecker();
