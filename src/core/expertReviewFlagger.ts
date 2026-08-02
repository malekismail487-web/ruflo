/**
 * Expert Review Flagger
 * Explicitly flags domains where internal automated checks alone cannot fully verify visual/physical realism.
 */

export interface ExpertReviewRequirement {
    domain: string;
    requiresHumanReview: boolean;
    automatedCoverageDescription: string;
    humanCheckList: string[];
}

export class ExpertReviewFlagger {
    private domainReviewRules: Record<string, string[]> = {
        "fluid_dynamics": [
            "Visual vorticity and turbulence realistic appearance",
            "Boundary layer separation surface artifacts",
            "Viscous dissipation aesthetic plausibility"
        ],
        "character_rigging": [
            "Anatomical skinning/mesh deformation aesthetics around joint flexions",
            "Weight paint smoothness across shoulders/hips",
            "Non-self-intersecting geometry during extreme poses"
        ],
        "soft_body_cloth": [
            "Wrinkle density and aesthetic cloth stiffness match material intent",
            "Self-collision penetration visual artifacts under high velocity"
        ]
    };

    assessDomainReviewNeeds(domain: string): ExpertReviewRequirement {
        const normalized = domain.toLowerCase().trim();
        const humanCheckList = this.domainReviewRules[normalized] || [];
        const requiresHumanReview = humanCheckList.length > 0;

        return {
            domain,
            requiresHumanReview,
            automatedCoverageDescription: requiresHumanReview 
                ? "Internal automated checks verify mathematical invariants (mass/momentum conservation), but subjective visual/anatomical realism requires domain expert inspection."
                : "Domain is fully covered by mathematical conservation laws and analytical cross-validation.",
            humanCheckList
        };
    }
}

export const expertReviewFlagger = new ExpertReviewFlagger();
