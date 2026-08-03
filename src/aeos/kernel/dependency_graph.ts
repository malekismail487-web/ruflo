/**
 * AEOS Kernel - Task Dependency Graph Manager
 * Implements DAG construction, cycle/deadlock detection (Tarjan/Kahn),
 * topological ordering, and parallel execution stage decomposition.
 */

import { TaskNode, UUID } from '../types';

export class TaskDependencyGraphManager {
  private tasks: Map<UUID, TaskNode> = new Map();

  public addTask(task: TaskNode): void {
    this.tasks.set(task.taskId, task);
  }

  public getTask(taskId: UUID): TaskNode | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): TaskNode[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Detects circular dependencies using DFS cycle detection.
   */
  public detectCycles(): { hasCycle: boolean; cyclePath?: UUID[] } {
    const visited = new Set<UUID>();
    const recursionStack = new Set<UUID>();
    const path: UUID[] = [];

    const dfs = (currentId: UUID): boolean => {
      visited.add(currentId);
      recursionStack.add(currentId);
      path.push(currentId);

      const task = this.tasks.get(currentId);
      if (task) {
        for (const depId of task.dependencies) {
          if (!this.tasks.has(depId)) continue;

          if (!visited.has(depId)) {
            if (dfs(depId)) return true;
          } else if (recursionStack.has(depId)) {
            path.push(depId);
            return true;
          }
        }
      }

      recursionStack.delete(currentId);
      path.pop();
      return false;
    };

    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) {
        if (dfs(taskId)) {
          return { hasCycle: true, cyclePath: [...path] };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Calculates deterministic execution stages using topological level grouping.
   * Tasks in the same stage can be executed concurrently in parallel.
   */
  public computeParallelExecutionStages(): Array<TaskNode[]> {
    const { hasCycle, cyclePath } = this.detectCycles();
    if (hasCycle) {
      throw new Error(`DEADLOCK ERROR: Circular dependency detected in task graph: ${cyclePath?.join(' -> ')}`);
    }

    const inDegree: Map<UUID, number> = new Map();
    const dependentsMap: Map<UUID, Set<UUID>> = new Map();

    for (const task of this.tasks.values()) {
      inDegree.set(task.taskId, task.dependencies.length);
      for (const depId of task.dependencies) {
        if (!dependentsMap.has(depId)) {
          dependentsMap.set(depId, new Set());
        }
        dependentsMap.get(depId)!.add(task.taskId);
      }
    }

    const stages: Array<TaskNode[]> = [];
    let currentStageIds = Array.from(this.tasks.values())
      .filter(t => (inDegree.get(t.taskId) || 0) === 0)
      .map(t => t.taskId);

    const completed = new Set<UUID>();

    while (currentStageIds.length > 0) {
      const stageTasks = currentStageIds.map(id => this.tasks.get(id)!);
      stages.push(stageTasks);

      for (const id of currentStageIds) {
        completed.add(id);
      }

      const nextStageIds: UUID[] = [];
      for (const id of currentStageIds) {
        const dependents = dependentsMap.get(id) || new Set();
        for (const depId of dependents) {
          if (!completed.has(depId)) {
            const remaining = (inDegree.get(depId) || 1) - 1;
            inDegree.set(depId, remaining);
            if (remaining === 0) {
              nextStageIds.push(depId);
            }
          }
        }
      }

      currentStageIds = nextStageIds;
    }

    return stages;
  }
}
