/**
 * Engine-Independent Scene Graph Data Model
 * Provides a renderer-agnostic representation of 3D entities, hierarchy,
 * transforms, meshes, materials, lighting, volumetric fog, and environment settings.
 */

export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

export interface ColorRGB {
    r: number; // 0-1
    g: number; // 0-1
    b: number; // 0-1
    a?: number;
}

export interface Transform3D {
    position: Vector3D;
    rotation: Vector3D; // Euler angles in degrees
    scale: Vector3D;
}

export interface PBRMaterial {
    id: string;
    name: string;
    baseColor: ColorRGB;
    metallic: number; // 0-1
    roughness: number; // 0-1
    specular?: number; // 0-1
    emissiveColor?: ColorRGB;
    emissiveIntensity?: number;
    normalMapPath?: string;
    roughnessMapPath?: string;
    albedoMapPath?: string;
    useNanite?: boolean;
}

export interface BoneTransform {
    boneName: string;
    parentBoneName: string | null;
    localTransform: Transform3D;
}

export interface ControlRigConfig {
    rigName: string;
    fkIkSwitching: boolean;
    bonesCount: number;
    ikSolvers: string[];
}

export interface MeshGeometry {
    id: string;
    primitiveType?: 'box' | 'cylinder' | 'sphere' | 'torus' | 'plane' | 'skeletal_character' | 'custom';
    assetPath?: string; // glTF / FBX / OBJ path if custom
    dimensions?: Vector3D;
    subdivisions?: number;
    enableNanite?: boolean;
    generateCollision?: boolean;
    skeletalBones?: BoneTransform[];
    controlRig?: ControlRigConfig;
}


export interface VolumetricFogConfig {
    enabled: boolean;
    density: number; // e.g. 0.02
    scatteringColor: ColorRGB;
    extinctionScale: number;
    viewDistance: number;
    heightFalloff: number;
}

export interface LightComponent {
    type: 'directional' | 'point' | 'spot' | 'sky';
    color: ColorRGB;
    intensity: number; // Lux / Lumens
    castShadows: boolean;
    volumetricScatteringIntensity?: number;
    attenuationRadius?: number; // for point/spot
    innerConeAngle?: number; // for spot
    outerConeAngle?: number; // for spot
}

export interface CameraComponent {
    fov: number; // Degrees
    focalLength?: number; // mm
    aperture?: number; // f-stop
    nearClip: number;
    farClip: number;
    isPrimary: boolean;
}

export interface PostProcessConfig {
    enableLumenGI: boolean;
    enableLumenReflections: boolean;
    bloomIntensity: number;
    exposureCompensation: number;
    motionBlurIntensity: number;
}

export interface SceneNode {
    id: string;
    name: string;
    parentId?: string;
    transform: Transform3D;
    mesh?: MeshGeometry;
    materialId?: string;
    light?: LightComponent;
    camera?: CameraComponent;
    tags?: string[];
    childrenIds: string[];
}

export interface SceneEnvironment {
    name: string;
    skyType: 'atmosphere' | 'hdri' | 'solid';
    ambientColor: ColorRGB;
    volumetricFog: VolumetricFogConfig;
    postProcess: PostProcessConfig;
}

export class SceneGraph {
    public id: string;
    public name: string;
    public environment: SceneEnvironment;
    public nodes: Map<string, SceneNode> = new Map();
    public materials: Map<string, PBRMaterial> = new Map();
    public rootNodeIds: string[] = [];

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.environment = {
            name: "Default Environment",
            skyType: 'atmosphere',
            ambientColor: { r: 0.05, g: 0.08, b: 0.15 },
            volumetricFog: {
                enabled: true,
                density: 0.025,
                scatteringColor: { r: 0.8, g: 0.85, b: 1.0 },
                extinctionScale: 1.0,
                viewDistance: 5000,
                heightFalloff: 0.05
            },
            postProcess: {
                enableLumenGI: true,
                enableLumenReflections: true,
                bloomIntensity: 1.2,
                exposureCompensation: 1.0,
                motionBlurIntensity: 0.1
            }
        };
    }

    addMaterial(material: PBRMaterial): void {
        this.materials.set(material.id, material);
    }

    addNode(node: SceneNode): void {
        this.nodes.set(node.id, node);
        if (node.parentId && this.nodes.has(node.parentId)) {
            const parent = this.nodes.get(node.parentId)!;
            if (!parent.childrenIds.includes(node.id)) {
                parent.childrenIds.push(node.id);
            }
        } else if (!node.parentId) {
            if (!this.rootNodeIds.includes(node.id)) {
                this.rootNodeIds.push(node.id);
            }
        }
    }

    getNode(id: string): SceneNode | undefined {
        return this.nodes.get(id);
    }

    getMaterial(id: string): PBRMaterial | undefined {
        return this.materials.get(id);
    }

    getStats(): { totalNodes: number; totalMaterials: number; lightsCount: number; camerasCount: number; meshNodesCount: number } {
        let lightsCount = 0;
        let camerasCount = 0;
        let meshNodesCount = 0;

        for (const node of this.nodes.values()) {
            if (node.light) lightsCount++;
            if (node.camera) camerasCount++;
            if (node.mesh) meshNodesCount++;
        }

        return {
            totalNodes: this.nodes.size,
            totalMaterials: this.materials.size,
            lightsCount,
            camerasCount,
            meshNodesCount
        };
    }

    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            environment: this.environment,
            nodes: Array.from(this.nodes.values()),
            materials: Array.from(this.materials.values()),
            stats: this.getStats()
        };
    }
}
