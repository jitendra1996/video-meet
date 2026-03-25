"use strict";
/**
 * MediaSoup Worker Pool
 *
 * Manages a pool of MediaSoup workers for load distribution.
 * Each worker runs in a separate process and can handle ~500 consumers.
 * For 1000 users: use 2+ workers (typically one per CPU core).
 *
 * @see https://mediasoup.org/documentation/v3/scalability
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const mediasoup = __importStar(require("mediasoup"));
const config_js_1 = require("./config.js");
class WorkerPool {
    workers = [];
    nextWorkerIndex = 0;
    /**
     * Initialize the worker pool with the configured number of workers.
     */
    async initialize() {
        const { numWorkers, router } = config_js_1.config;
        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: "warn",
                logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
                rtcMinPort: config_js_1.config.webRtcPortRange.min,
                rtcMaxPort: config_js_1.config.webRtcPortRange.max,
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
    getNextWorker() {
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
    async createRouter() {
        const workerInfo = this.workers.reduce((min, w) => w.routerCount < min.routerCount ? w : min);
        const router = await workerInfo.worker.createRouter({
            mediaCodecs: config_js_1.config.router.mediaCodecs,
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
    async close() {
        for (const { worker } of this.workers) {
            worker.close();
        }
        this.workers = [];
    }
}
exports.WorkerPool = WorkerPool;
