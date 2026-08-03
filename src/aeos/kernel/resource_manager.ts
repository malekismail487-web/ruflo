/**
 * AEOS Kernel - Computational Resource Manager
 * Tracks CPU, GPU, VRAM, RAM, Disk, and API quotas.
 * Dynamically governs workforce scaling and prevents over-allocation.
 */

import { ComputeResourceMetrics, UUID } from '../types';

export class ResourceManager {
  private static instance: ResourceManager;

  private metrics: ComputeResourceMetrics = {
    cpuUtilizationPercent: 24.5,
    gpuUtilizationPercent: 18.0,
    vramUsedMb: 2400,
    vramTotalMb: 16384,
    ramUsedMb: 8192,
    ramTotalMb: 65536,
    diskUsedGb: 120,
    diskFreeGb: 880,
    apiQuotaPercentUsed: 12.0,
    activeWorkerCount: 0,
    maxWorkerCapacity: 32
  };

  private taskExecutionQueue: Array<{ taskId: UUID; priority: number; resolve: () => void }> = [];

  private constructor() {}

  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  public getMetrics(): ComputeResourceMetrics {
    return { ...this.metrics };
  }

  public updateMetrics(partial: Partial<ComputeResourceMetrics>): void {
    Object.assign(this.metrics, partial);
  }

  /**
   * Assesses whether a workforce allocation request can be accommodated by current resources.
   */
  public evaluateWorkforceCapacity(requestedWorkers: number): {
    canAccommodate: boolean;
    recommendedWorkerCount: number;
    resourceBottleneck?: string;
  } {
    const availableSlots = this.metrics.maxWorkerCapacity - this.metrics.activeWorkerCount;

    if (this.metrics.cpuUtilizationPercent > 85) {
      return {
        canAccommodate: false,
        recommendedWorkerCount: 0,
        resourceBottleneck: `CPU utilization high (${this.metrics.cpuUtilizationPercent.toFixed(1)}%)`
      };
    }

    if (this.metrics.ramUsedMb / this.metrics.ramTotalMb > 0.90) {
      return {
        canAccommodate: false,
        recommendedWorkerCount: 0,
        resourceBottleneck: `RAM utilization high (${(this.metrics.ramUsedMb / 1024).toFixed(1)}GB used)`
      };
    }

    if (availableSlots <= 0) {
      return {
        canAccommodate: false,
        recommendedWorkerCount: 0,
        resourceBottleneck: `Active worker capacity saturated (${this.metrics.activeWorkerCount}/${this.metrics.maxWorkerCapacity})`
      };
    }

    if (requestedWorkers <= availableSlots) {
      return { canAccommodate: true, recommendedWorkerCount: requestedWorkers };
    } else {
      return {
        canAccommodate: true,
        recommendedWorkerCount: availableSlots,
        resourceBottleneck: `Partial allocation due to worker slot ceiling (${availableSlots} slots remaining)`
      };
    }
  }

  public registerWorkerStart(): void {
    this.metrics.activeWorkerCount++;
  }

  public registerWorkerFinish(): void {
    this.metrics.activeWorkerCount = Math.max(0, this.metrics.activeWorkerCount - 1);
  }
}
