/**
 * AEOS Kernel - Architectural Proposal Pipeline
 * Enforces structured proposal review gates:
 *  Worker -> Parent Review -> AI Coder Review -> Implementation -> Validation -> Knowledge Graph
 */

import {
  ActionPermission,
  AgentType,
  ArchitecturalProposal,
  ProposalStatus,
  UUID
} from '../types';
import { AuthorityRegistry } from './authority';
import { CommunicationHub } from './communication';

export class ProposalPipeline {
  private static instance: ProposalPipeline;
  private authority: AuthorityRegistry;
  private comms: CommunicationHub;
  private proposals: Map<UUID, ArchitecturalProposal> = new Map();

  private constructor() {
    this.authority = AuthorityRegistry.getInstance();
    this.comms = CommunicationHub.getInstance();
  }

  public static getInstance(): ProposalPipeline {
    if (!ProposalPipeline.instance) {
      ProposalPipeline.instance = new ProposalPipeline();
    }
    return ProposalPipeline.instance;
  }

  /**
   * Worker submits an architectural proposal to its supervising Parent.
   */
  public submitProposal(
    proposerId: UUID,
    title: string,
    motivation: string,
    expectedBenefits: string[],
    risks: string[],
    validationStrategy: string
  ): ArchitecturalProposal {
    const proposer = this.authority.getAgent(proposerId);
    if (!proposer) throw new Error(`Agent ${proposerId} not registered.`);

    if (!this.authority.isAuthorized(proposerId, ActionPermission.SUBMIT_PROPOSAL)) {
      throw new Error(`SECURITY VIOLATION: Agent ${proposerId} lacks SUBMIT_PROPOSAL permission.`);
    }

    if (!proposer.parentId) {
      throw new Error(`Worker agent ${proposerId} has no supervising parent.`);
    }

    const proposalId: UUID = `PROP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const proposal: ArchitecturalProposal = {
      id: proposalId,
      proposerId,
      parentId: proposer.parentId,
      title,
      discipline: proposer.discipline,
      motivation,
      expectedBenefits,
      risks,
      validationStrategy,
      status: ProposalStatus.SUBMITTED,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.proposals.set(proposalId, proposal);

    // Announce to Family Log
    this.comms.publishToFamilyLog(
      proposerId,
      'DISCUSSION',
      `Architectural Proposal Submitted: "${title}" [${proposalId}]`,
      { proposalId, motivation }
    );

    return proposal;
  }

  /**
   * Parent Agent reviews the worker's proposal.
   */
  public reviewByParent(
    parentId: UUID,
    proposalId: UUID,
    decision: 'APPROVE' | 'REJECT' | 'REVISE',
    feedback: string
  ): ArchitecturalProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found.`);

    if (proposal.parentId !== parentId) {
      throw new Error(`GOVERNANCE VIOLATION: Parent ${parentId} is not the supervisor for proposal ${proposalId}.`);
    }

    proposal.parentFeedback = feedback;
    proposal.updatedAt = Date.now();

    if (decision === 'APPROVE') {
      proposal.status = ProposalStatus.PARENT_APPROVED;
    } else if (decision === 'REJECT') {
      proposal.status = ProposalStatus.PARENT_REJECTED;
    } else {
      proposal.status = ProposalStatus.PARENT_REVISED;
    }

    return proposal;
  }

  /**
   * Root Authority (AI Coder) makes the final governance decision.
   */
  public reviewByAICoder(
    callerId: UUID,
    proposalId: UUID,
    decision: 'APPROVE' | 'REJECT',
    feedback: string
  ): ArchitecturalProposal {
    if (callerId !== this.authority.getRootAgentId()) {
      throw new Error(`GOVERNANCE VIOLATION: Only AI Coder (Root Authority) can grant final proposal approval.`);
    }

    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found.`);

    if (proposal.status !== ProposalStatus.PARENT_APPROVED) {
      throw new Error(`GOVERNANCE VIOLATION: Proposal must be approved by Parent before AI Coder review.`);
    }

    proposal.aiCoderFeedback = feedback;
    proposal.updatedAt = Date.now();

    if (decision === 'APPROVE') {
      proposal.status = ProposalStatus.AI_CODER_APPROVED;
      // Publish to Global Log
      this.comms.publishToGlobalLog(
        callerId,
        'DECISION',
        `Approved Architectural Proposal: "${proposal.title}" [${proposal.id}]`,
        { proposalId: proposal.id, discipline: proposal.discipline }
      );
    } else {
      proposal.status = ProposalStatus.AI_CODER_REJECTED;
    }

    return proposal;
  }

  /**
   * Marks proposal as actively being implemented.
   */
  public beginImplementation(agentId: UUID, proposalId: UUID): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found.`);

    if (proposal.status !== ProposalStatus.AI_CODER_APPROVED) {
      throw new Error(`GOVERNANCE VIOLATION: Cannot implement proposal without AI Coder approval.`);
    }

    proposal.status = ProposalStatus.IMPLEMENTING;
    proposal.updatedAt = Date.now();
  }

  /**
   * Validator Agent submits verification evidence for the implemented proposal.
   */
  public recordValidation(
    validatorId: UUID,
    proposalId: UUID,
    passed: boolean,
    metrics: Record<string, any>,
    evidenceArtifacts: string[]
  ): ArchitecturalProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found.`);

    if (proposal.status !== ProposalStatus.IMPLEMENTING) {
      throw new Error(`Proposal ${proposalId} is not in IMPLEMENTING status.`);
    }

    proposal.validationReport = {
      passed,
      metrics,
      evidenceArtifacts
    };
    proposal.updatedAt = Date.now();

    if (passed) {
      proposal.status = ProposalStatus.VALIDATED;
      this.comms.publishToGlobalLog(
        this.authority.getRootAgentId(),
        'DISCOVERY',
        `Proposal Validated with Evidence: "${proposal.title}"`,
        metrics
      );
    }

    return proposal;
  }

  public getProposal(proposalId: UUID): ArchitecturalProposal | undefined {
    return this.proposals.get(proposalId);
  }

  public getAllProposals(): ArchitecturalProposal[] {
    return Array.from(this.proposals.values());
  }
}
