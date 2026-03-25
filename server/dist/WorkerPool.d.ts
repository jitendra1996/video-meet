/**
 * MediaSoup Worker Pool
 *
 * Manages a pool of MediaSoup workers for load distribution.
 * Each worker runs in a separate process and can handle ~500 consumers.
 * For 1000 users: use 2+ workers (typically one per CPU core).
 *
 * @see https://mediasoup.org/documentation/v3/scalability
 */
import type { Worker, Router } from "mediasoup/types";
export declare class WorkerPool {
    private workers;
    private nextWorkerIndex;
    /**
     * Initialize the worker pool with the configured number of workers.
     */
    initialize(): Promise<void>;
    /**
     * Get the next worker using round-robin load balancing.
     * Distributes rooms evenly across workers for optimal performance.
     */
    getNextWorker(): Worker;
    /**
     * Create a new router on the least-loaded worker.
     */
    createRouter(): Promise<Router>;
    /**
     * Close all workers and cleanup.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=WorkerPool.d.ts.map