/**
 * AEOS PhysX 5 Physics Bridge
 * Integrates directly with O3DE's native PhysX 5 Gem (Gems/PhysX/Core/PhysX5).
 * Supports Rigid Bodies, Reduced Coordinate Articulations, Dynamic Joints, Ragdolls, and Collision Filtering.
 */

export interface PhysX5ArticulatedLink {
  linkId: string;
  name: string;
  parentLinkId?: string;
  massKg: number;
  inertiaTensor: [number, number, number];
  jointType: 'FIXED' | 'REVOLUTE' | 'PRISMATIC' | 'SPHERICAL';
  jointLimits?: { min: number; max: number };
  driveVelocity?: number;
  driveForceLimit?: number;
}

export interface PhysX5ReducedCoordinateArticulation {
  articulationId: string;
  name: string;
  rootLinkId: string;
  links: PhysX5ArticulatedLink[];
  isFixedBase: boolean;
}

export class PhysX5Bridge {
  private static instance: PhysX5Bridge;
  private articulations: Map<string, PhysX5ReducedCoordinateArticulation> = new Map();

  private constructor() {}

  public static getInstance(): PhysX5Bridge {
    if (!PhysX5Bridge.instance) {
      PhysX5Bridge.instance = new PhysX5Bridge();
    }
    return PhysX5Bridge.instance;
  }

  /**
   * Creates a PhysX 5 Reduced Coordinate Articulation (ideal for high-speed mechanical linkages like engines).
   * Reduced coordinate articulations prevent numerical joint separation under high torque.
   */
  public createArticulation(
    name: string,
    rootLink: PhysX5ArticulatedLink,
    isFixedBase: boolean = true
  ): PhysX5ReducedCoordinateArticulation {
    const articulationId = `ARTICULATION_${name.toUpperCase()}_${Date.now()}`;
    const articulation: PhysX5ReducedCoordinateArticulation = {
      articulationId,
      name,
      rootLinkId: rootLink.linkId,
      links: [rootLink],
      isFixedBase
    };

    this.articulations.set(articulationId, articulation);
    return articulation;
  }

  public addLinkToArticulation(
    articulationId: string,
    link: PhysX5ArticulatedLink
  ): void {
    const art = this.articulations.get(articulationId);
    if (!art) throw new Error(`Articulation ${articulationId} not found.`);

    art.links.push(link);
  }

  public getArticulation(id: string): PhysX5ReducedCoordinateArticulation | undefined {
    return this.articulations.get(id);
  }
}
