/**
 * MediaSoup Worker Pool
 *
 * Manages a pool of MediaSoup workers for load distribution.
 * Each worker runs in a separate process and can handle ~500 consumers.
 * For 1000 users: use 2+ workers (typically one per CPU core).
 *
 * @see https://mediasoup.org/documentation/v3/scalability
 */

import * as mediasoup from "mediasoup";
import type { Worker, Router } from "mediasoup/types";
import { config } from "./config.js";

/** Worker with its current load (number of routers) */
interface WorkerInfo {
  worker: Worker;
  routerCount: number;
}

export class WorkerPool {
  private workers: WorkerInfo[] = [];
  private nextWorkerIndex = 0;

  /**
   * Initialize the worker pool with the configured number of workers.
   */
  async initialize(): Promise<void> {
    const { numWorkers, router } = config;

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: "warn",
        logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
        rtcMinPort: config.webRtcPortRange.min,
        rtcMaxPort: config.webRtcPortRange.max,
      });

      worker.on("died", () => {
        console.error(`[WorkerPool] Worker ${worker.pid} died unexpectedly`);
        process.exit(1);
      });

      this.workers.push({ worker, routerCount: 0 });
    }

    console.log(`[WorkerPool] Initialized ${this.workers.length} workers`);
  }

  /**
   * Get the next worker using round-robin load balancing.
   * Distributes rooms evenly across workers for optimal performance.
   */
  getNextWorker(): Worker {
    if (this.workers.length === 0) {
      throw new Error("Worker pool not initialized");
    }

    // Round-robin: pick worker with fewest routers
    let selected = this.workers[0];
    for (const w of this.workers) {
      if (w.routerCount < selected.routerCount) {
        selected = w;
      }
    }

    return selected.worker;
  }

  /**
   * Create a new router on the least-loaded worker.
   */
  async createRouter(): Promise<Router> {
    const workerInfo = this.workers.reduce((min, w) =>
      w.routerCount < min.routerCount ? w : min
    );

    const router = await workerInfo.worker.createRouter({
      mediaCodecs: config.router.mediaCodecs,
    });

    workerInfo.routerCount++;

    router.on("workerclose", () => {
      workerInfo.routerCount = Math.max(0, workerInfo.routerCount - 1);
    });

    return router;
  }

  /**
   * Close all workers and cleanup.
   */
  async close(): Promise<void> {
    for (const { worker } of this.workers) {
      worker.close();
    }
    this.workers = [];
  }
}
