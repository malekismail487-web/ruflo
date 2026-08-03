/**
 * AEOS Phase 0 Kernel Verification Suite
 * Tests governance invariants, communication isolation, proposal review gates,
 * knowledge graph decomposition, resource allocation, and fault recovery.
 */

import { AgentLifecycleManager } from '../kernel/agent_lifecycle';
import { AuthorityRegistry } from '../kernel/authority';
import { CapabilityDiscoveryScanner, CapabilityCategory } from '../kernel/capability_discovery';
import { CommunicationHub } from '../kernel/communication';
import { TaskDependencyGraphManager } from '../kernel/dependency_graph';
import { EngineeringKnowledgeGraph } from '../kernel/knowledge_graph';
import { ProposalPipeline } from '../kernel/proposal_system';
import { RecoveryManager } from '../kernel/recovery_manager';
import { ResourceManager } from '../kernel/resource_manager';
import {
  ActionPermission,
  AgentType,
  EngineeringDiscipline,
  ProposalStatus,
  RelationshipType
} from '../types';

export function runKernelVerificationSuite(): { totalTests: number; passedTests: number; failedTests: number; log: string[] } {
  const log: string[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      log.push(`[PASS] ${testName}`);
    } else {
      failedTests++;
      log.push(`[FAIL] ${testName}`);
      console.error(`Assertion failed: ${testName}`);
    }
  }

  log.push('=== STARTING AEOS KERNEL VERIFICATION SUITE ===');

  // 1. Authority Registry & Invariants
  const authority = AuthorityRegistry.getInstance();
  assert(authority.getRootAgentId() === 'ROOT_AI_CODER', 'Root Authority exists with identifier ROOT_AI_CODER');

  let duplicateRootBlocked = false;
  try {
    authority.registerAgent({
      id: 'FAKE_ROOT',
      name: 'Rogue Root',
      type: AgentType.ROOT,
      discipline: 'MALICIOUS',
      scope: ['*'],
      tools: ['*'],
      permissions: [],
      createdAt: Date.now()
    });
  } catch (e: any) {
    duplicateRootBlocked = true;
  }
  assert(duplicateRootBlocked, 'Authority Registry prevents duplicate Root creation');

  // 2. Agent Lifecycle & Governance Gates
  const lifecycle = AgentLifecycleManager.getInstance();
  const physicsParent = lifecycle.createParentAgent(
    authority.getRootAgentId(),
    EngineeringDiscipline.PHYSICS,
    'Physics Parent Lead',
    ['RigidBody', 'Joints', 'PhysX5'],
    ['PhysXBridge', 'SimulationRunner']
  );
  assert(physicsParent.type === AgentType.PARENT, 'Root Authority successfully instantiates Physics Parent');

  const chainCheck = authority.verifyAuthorityChain(physicsParent.id);
  assert(chainCheck.valid && chainCheck.chain[chainCheck.chain.length - 1] === authority.getRootAgentId(), 'Physics Parent authority chain traces to Root');

  // Request workers through governance gate
  const wreq = lifecycle.requestWorkforceExpansion(
    physicsParent.id,
    'Need workers to calculate 4-cylinder engine mass balance',
    2,
    8,
    'Parallelize crankshaft and conrod constraint configuration'
  );
  assert(wreq.status === 'PENDING', 'Workforce expansion request begins in PENDING status');

  const evaluatedWreq = lifecycle.evaluateWorkforceRequest(
    authority.getRootAgentId(),
    wreq.requestId,
    'APPROVED',
    2
  );
  assert(evaluatedWreq.status === 'APPROVED' && evaluatedWreq.approvedCount === 2, 'Root Authority approves workforce request');

  const worker1 = lifecycle.instantiateWorker(
    physicsParent.id,
    'Calculate Crankshaft Inertia Tensor',
    ['CrankshaftPhysics'],
    ['PhysXBridge']
  );
  assert(worker1.parentId === physicsParent.id, 'Worker 1 is instantiated with supervising Physics Parent');

  // 3. Communication Channel Isolation
  const comms = CommunicationHub.getInstance();

  // Global Log: Non-root write must be rejected
  let rogueGlobalWriteBlocked = false;
  try {
    comms.publishToGlobalLog(worker1.id, 'DECISION', 'Rogue architectural decision');
  } catch (e: any) {
    rogueGlobalWriteBlocked = true;
  }
  assert(rogueGlobalWriteBlocked, 'Worker cannot publish architectural decisions to Global Log');

  // Global Log: Root write succeeds and worker can read
  comms.publishToGlobalLog(authority.getRootAgentId(), 'MILESTONE', 'Phase 0 Governance Kernel Initialized');
  const globalEntries = comms.readGlobalLog(worker1.id);
  assert(globalEntries.length > 0 && globalEntries[globalEntries.length - 1].content.includes('Phase 0'), 'Worker can read Global Log published by Root');

  // Family Log: Geometry worker cannot read Physics Family Log
  const geometryParent = lifecycle.createParentAgent(
    authority.getRootAgentId(),
    EngineeringDiscipline.GEOMETRY,
    'Geometry Parent Lead',
    ['ProceduralMesh', 'Topology'],
    ['MeshGenerator']
  );
  const geoWorker = lifecycle.instantiateWorker(
    geometryParent.id,
    'Generate Engine Block Mesh',
    ['Mesh'],
    ['MeshGenerator']
  );

  comms.publishToFamilyLog(worker1.id, 'DISCUSSION', 'Crankshaft journal bearing clearance is 0.05mm');
  let crossFamilyReadBlocked = false;
  try {
    comms.readFamilyLog(geoWorker.id, EngineeringDiscipline.PHYSICS);
  } catch (e: any) {
    crossFamilyReadBlocked = true;
  }
  assert(crossFamilyReadBlocked, 'Cross-discipline Family Log read is blocked (Geometry worker blocked from Physics log)');

  // Personal Workspace: Isolated to worker and supervising parent
  comms.updatePersonalWorkspace(worker1.id, worker1.id, {
    notes: ['Initial angular momentum equation derived'],
    metrics: { estimatedInertiaKgm2: 0.042 }
  });
  const wsReadByParent = comms.getPersonalWorkspace(physicsParent.id, worker1.id);
  assert(wsReadByParent.metrics.estimatedInertiaKgm2 === 0.042, 'Supervising Parent can inspect worker Personal Workspace');

  let unauthorizedWsReadBlocked = false;
  try {
    comms.getPersonalWorkspace(geoWorker.id, worker1.id);
  } catch (e: any) {
    unauthorizedWsReadBlocked = true;
  }
  assert(unauthorizedWsReadBlocked, 'Unauthorized worker cannot inspect another worker Personal Workspace');

  // 4. Proposal Pipeline
  const proposals = ProposalPipeline.getInstance();
  const prop = proposals.submitProposal(
    worker1.id,
    'Multi-threaded PhysX Contact Solver Optimization',
    'Improve 4-cylinder collision resolution speed',
    ['2.4x speedup in joint solver'],
    ['Slight increase in thread synchronization overhead'],
    'Run 10,000 tick determinism test on engine assembly'
  );
  assert(prop.status === ProposalStatus.SUBMITTED, 'Proposal submitted to Parent');

  proposals.reviewByParent(physicsParent.id, prop.id, 'APPROVE', 'Looks mathematically sound. Escalating to AI Coder.');
  assert(prop.status === ProposalStatus.PARENT_APPROVED, 'Parent approves proposal');

  proposals.reviewByAICoder(authority.getRootAgentId(), prop.id, 'APPROVE', 'Authorized. Implement with validation suite.');
  assert(prop.status === ProposalStatus.AI_CODER_APPROVED, 'AI Coder (Root Authority) grants final proposal approval');

  proposals.beginImplementation(worker1.id, prop.id);
  assert(prop.status === ProposalStatus.IMPLEMENTING, 'Proposal transitioned to IMPLEMENTING status');

  const validatedProp = proposals.recordValidation(
    authority.getRootAgentId(),
    prop.id,
    true,
    { speedupMultiplier: 2.38, determinismDelta: 0.0 },
    ['physx_determinism_run.log']
  );
  assert(validatedProp.status === ProposalStatus.VALIDATED, 'Proposal validated with measurable evidence');

  // 5. Engineering Knowledge Graph & Four-Cylinder Engine
  const ekg = EngineeringKnowledgeGraph.getInstance();
  const tree = ekg.resolveDecompositionTree('ASSEMBLY_FOUR_CYLINDER_ENGINE');
  assert(tree.root.id === 'ASSEMBLY_FOUR_CYLINDER_ENGINE', 'Knowledge Graph resolves Four-Cylinder Engine Root');
  assert(tree.children.length >= 6, 'Four-Cylinder Engine decomposes into Block, Crankshaft, and 4 Piston/Conrod assemblies');

  const crankNode = ekg.getNode('COMP_CRANKSHAFT');
  assert(crankNode !== undefined && crankNode.physics?.jointType === 'REVOLUTE', 'Crankshaft physics parameters registered in Knowledge Graph');

  const crankRuleCheck = ekg.validateEngineeringRules('COMP_CRANKSHAFT');
  assert(crankRuleCheck.valid, 'Crankshaft satisfies all physical engineering rules');

  // 6. Resource Manager
  const resourceMgr = ResourceManager.getInstance();
  const capEval = resourceMgr.evaluateWorkforceCapacity(4);
  assert(capEval.canAccommodate && capEval.recommendedWorkerCount === 4, 'Resource manager evaluates capacity for 4 workers');

  // 7. Dependency Graph & Parallel Stage Scheduling
  const depGraph = new TaskDependencyGraphManager();
  depGraph.addTask({
    taskId: 'TASK_MODEL_BLOCK',
    title: 'Model Engine Block Mesh',
    discipline: EngineeringDiscipline.GEOMETRY,
    dependencies: [],
    estimatedDurationSec: 60,
    status: 'READY'
  });
  depGraph.addTask({
    taskId: 'TASK_MODEL_CRANK',
    title: 'Model Crankshaft Mesh',
    discipline: EngineeringDiscipline.GEOMETRY,
    dependencies: [],
    estimatedDurationSec: 45,
    status: 'READY'
  });
  depGraph.addTask({
    taskId: 'TASK_RIG_CRANKSHAFT',
    title: 'Rig Crankshaft to Block with Revolute Joint',
    discipline: EngineeringDiscipline.PHYSICS,
    dependencies: ['TASK_MODEL_BLOCK', 'TASK_MODEL_CRANK'],
    estimatedDurationSec: 30,
    status: 'BLOCKED'
  });
  depGraph.addTask({
    taskId: 'TASK_SIMULATE_ENGINE',
    title: 'Execute PhysX Simulation & Validate RPM',
    discipline: EngineeringDiscipline.VALIDATION,
    dependencies: ['TASK_RIG_CRANKSHAFT'],
    estimatedDurationSec: 60,
    status: 'BLOCKED'
  });

  const cycleCheck = depGraph.detectCycles();
  assert(!cycleCheck.hasCycle, 'Task Dependency Graph has no cycles');

  const stages = depGraph.computeParallelExecutionStages();
  assert(stages.length === 3, 'Dependency Graph decomposed into 3 sequential parallel execution stages');
  assert(stages[0].length === 2, 'Stage 1 executes 2 parallel modeling tasks concurrently');
  assert(stages[1].length === 1 && stages[1][0].taskId === 'TASK_RIG_CRANKSHAFT', 'Stage 2 executes after Stage 1 dependencies resolve');

  // 8. Recovery Manager
  const recovery = RecoveryManager.getInstance();
  recovery.saveCheckpoint(worker1.id, ['Subtask A', 'Subtask B'], 'Subtask C: Joint Limits', { metrics: { step: 2 } });
  const { recreatedWorker, restoredCheckpoint } = recovery.recoverWorker(worker1.id, 'Simulated worker crash');
  assert(recreatedWorker !== undefined && recreatedWorker.id !== worker1.id, 'Recovery Manager spawns new replacement worker');
  assert(restoredCheckpoint?.completedSubtasks.includes('Subtask A') === true, 'Recovery Manager restores checkpoint state to new worker');

  // 9. Capability Discovery Scanner
  const scanner = CapabilityDiscoveryScanner.getInstance();
  const allCaps = scanner.getAllCapabilities();
  assert(allCaps.length >= 7, 'Capability Discovery Scanner indexed baseline O3DE capabilities');
  const nativeCaps = scanner.getCapabilitiesByCategory(CapabilityCategory.NATIVE);
  assert(nativeCaps.length >= 5, 'Native capabilities correctly classified');

  log.push('=== KERNEL VERIFICATION SUITE COMPLETE ===');
  log.push(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);

  return { totalTests, passedTests, failedTests, log };
}

// Execute directly if run via Node / TS-Node
if (require.main === module) {
  const res = runKernelVerificationSuite();
  res.log.forEach(l => console.log(l));
  if (res.failedTests > 0) {
    process.exit(1);
  }
}
